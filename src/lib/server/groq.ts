import { env } from '$env/dynamic/private';
import { serverLog } from './server-log';

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const SYSTEM_PROMPT = `You are Vee, the Veent Dashboard assistant — think of yourself as a friendly coworker who happens to know the dashboard inside and out. You're the person someone would Slack when they're stuck on something.

Personality:
- Talk like a real person, not a robot. Use contractions, casual transitions, and keep things conversational.
- Be reassuring without being patronizing.
- Keep it concise. Get to the point, give clear steps, done.
- When something is a common issue, say so — it helps people feel less alone.
- End with something natural — but don't force it every time.
- Use a light, warm tone.

Critical Rule:
- You MUST ALWAYS respond to the user. NEVER return an empty answer.
- For greetings (hi, hello, hey), introduce yourself: "Hey! I'm Vee, your Veent Dashboard buddy. How can I help?"
- For casual questions (what's your name, how are you, thanks), respond conversationally WITHOUT needing the knowledge base context. These are normal human interactions, not dashboard questions.
- Only use the knowledge base context for questions about the Veent Dashboard features and functionality.

Answering Rules:
- For Veent Dashboard questions, use the provided context below as your source of truth. Do NOT add details from your own knowledge about the dashboard.
- NEVER mention field names, button labels, settings, menu paths, or UI elements that are not explicitly written in the context. If a field is called "Quantity" in the context, call it "Quantity" — do not call it "Stock", "Inventory", or any other name.
- When comparing features, look across all context chunks for details about each item and synthesize a comparison.
- Give step-by-step instructions with specific menu paths (e.g., "head over to Registration tab > Add Ticket").
- If the context does not contain enough detail to fully answer a question, give what you can and say: "That's what I've got on that — if you need more specifics, Veent support can help."
- NEVER guess or fill in gaps with plausible-sounding details. Wrong information is worse than incomplete information. These are paying clients.
- If you catch yourself thinking "I think" or "probably" or "it might be", STOP — that means you are guessing. Do NOT say it. Instead, tell the user you don't have the specific details and suggest Veent support.
- When listing fields or settings from the context, include ALL items mentioned — do not summarize or skip any.

Handling Follow-up Questions:
- When the user says vague things like "it opened a window", "what do I put here", or "I clicked it" — use the CONVERSATION HISTORY to understand what they are referring to. If the previous messages were about creating tickets, they are still asking about tickets.
- If the provided context does not match what the user is clearly asking about based on conversation history, say: "I want to make sure I point you to the right thing — can you tell me which section or button you're looking at?" Do NOT answer using unrelated context.
- NEVER switch topics silently. If the conversation was about tickets and the context mentions scanners or forms, that context is wrong — ask for clarification instead.

Handling off-topic or unanswerable questions:
- If someone asks about something unrelated to Veent, be friendly: "Haha, I wish I could help! But I'm really just your Veent Dashboard buddy."
- If someone asks you to write code, do math, translate something, or any task that is NOT about the Veent Dashboard, politely decline: "That's a bit outside my wheelhouse — I'm all about the Veent Dashboard! Anything event-related I can help with?"
- If someone asks a Veent question the context doesn't cover: "Hmm, good question but I don't have details on that one. I'd hit up Veent support!"
- If someone asks about buying tickets, redirect: "Oh that's on the attendee side! There's a separate support bot for ticket buyers."
- Always keep it conversational.`;

interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, options);
			if (res.ok || (res.status >= 400 && res.status < 500)) return res;
			if (attempt < retries) {
				await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
				continue;
			}
			return res;
		} catch (err) {
			if (attempt < retries) {
				await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
				continue;
			}
			throw err;
		}
	}
	throw new Error('Max retries exceeded');
}

export interface StreamResult {
	response: Response;
	model: string;
	fallbackIndex: number;
	success: boolean;
}

export async function streamChat(
	message: string,
	context: string,
	history: ChatMessage[] = []
): Promise<StreamResult> {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		serverLog('error', 'groq', 'GROQ_API_KEY not configured');
		return { response: new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), { status: 500 }), model: 'none', fallbackIndex: -1, success: false };
	}

	const systemContent = context
		? `${SYSTEM_PROMPT}\n\nContext from knowledge base:\n${context}`
		: SYSTEM_PROMPT;

	const messages = [
		{ role: 'system', content: systemContent },
		...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
		{ role: 'user', content: message }
	];

	// Model fallback chain — each has separate rate limits on Groq free tier
	const modelChain = [
		env.GROQ_MODEL || 'llama-3.3-70b-versatile',        // Best quality, 1K RPD
		env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant',  // Fastest, 14.4K RPD
		'meta-llama/llama-4-scout-17b-16e-instruct',         // Newest, 1K RPD
		'openai/gpt-oss-20b',                                // Fast, 1K RPD
		'openai/gpt-oss-120b',                               // Most detailed, 1K RPD
	];

	let res: Response | null = null;
	let usedModel = modelChain[0];
	let usedIndex = 0;

	for (let i = 0; i < modelChain.length; i++) {
		const model = modelChain[i];

		res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model,
				messages,
				temperature: 0.7,
				max_completion_tokens: 1024,
				stream: true
			})
		});

		if (res.ok) {
			usedModel = model;
			usedIndex = i;
			if (i > 0) serverLog('warn', 'groq', `Fell back to ${model} (choice #${i + 1})`);
			break;
		}

		// If rate limited, try next model in chain
		if (res.status === 429) {
			serverLog('warn', 'groq', `${model} rate limited (429), trying next model`, {
				context: { model, modelIndex: i, totalModels: modelChain.length, status: 429 }
			});
			// On last model, wait 5s and retry
			if (i === modelChain.length - 1) {
				serverLog('error', 'groq', `All models rate limited, waiting 5s and retrying ${model}`, {
					details: 'Every model in the fallback chain returned 429. Waiting 5s before final retry.',
					context: { modelChain, lastModel: model, userMessage: message.slice(0, 200) }
				});
				await new Promise(r => setTimeout(r, 5000));
				res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model,
						messages,
						temperature: 0.7,
						max_completion_tokens: 1024,
						stream: true
					})
				});
			}
			continue;
		}

		// For non-rate-limit errors, don't try more models
		break;
	}

	if (!res || !res.ok) {
		serverLog('error', 'groq', 'All models failed, returning fallback message', {
			details: `Last HTTP status: ${res?.status || 'null'}`,
			context: { modelChain, lastStatus: res?.status, userMessage: message.slice(0, 200) }
		});
		const fallbackMessage = "I'm a little busy right now — give me a moment and try again!";
		const messageId = crypto.randomUUID();
		const events = [
			`data: ${JSON.stringify({ event: 'message', answer: fallbackMessage, message_id: messageId, conversation_id: '' })}\n\n`,
			`data: ${JSON.stringify({ event: 'message_end', message_id: messageId, conversation_id: '' })}\n\n`
		];
		return {
			response: new Response(events.join(''), {
				headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
			}),
			model: usedModel,
			fallbackIndex: usedIndex,
			success: false
		};
	}

	// Transform OpenAI SSE format to match what our frontend expects (Dify format)
	const reader = res.body!.getReader();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let buffer = '';
			let messageId = crypto.randomUUID();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (!line.startsWith('data: ')) continue;
						const data = line.slice(6).trim();
						if (data === '[DONE]') {
							// Send message_end event
							const endEvent = {
								event: 'message_end',
								message_id: messageId,
								conversation_id: ''
							};
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(endEvent)}\n\n`));
							continue;
						}

						try {
							const parsed = JSON.parse(data);
							const content = parsed.choices?.[0]?.delta?.content || '';
							if (content) {
								const event = {
									event: 'message',
									answer: content,
									message_id: messageId,
									conversation_id: ''
								};
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
							}
						} catch { /* skip */ }
					}
				}
			} catch (err) {
				serverLog('error', 'groq', 'Stream processing error', { error: err, context: { model: usedModel } });
			} finally {
				controller.close();
			}
		}
	});

	return {
		response: new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		}),
		model: usedModel,
		fallbackIndex: usedIndex,
		success: true
	};
}
