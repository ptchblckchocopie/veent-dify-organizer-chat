import { env } from '$env/dynamic/private';

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

export async function streamChat(
	message: string,
	context: string,
	history: ChatMessage[] = []
): Promise<Response> {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), { status: 500 });
	}

	const systemContent = context
		? `${SYSTEM_PROMPT}\n\nContext from knowledge base:\n${context}`
		: SYSTEM_PROMPT;

	const messages = [
		{ role: 'system', content: systemContent },
		...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
		{ role: 'user', content: message }
	];

	const primaryModel = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
	const fallbackModel = env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';
	const models = [primaryModel, fallbackModel];

	let res: Response | null = null;

	for (const model of models) {
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
			if (model !== primaryModel) console.log(`[Groq] Fell back to ${model}`);
			break;
		}

		// If rate limited (429), try fallback model
		if (res.status === 429 && model === primaryModel) {
			console.log(`[Groq] ${primaryModel} rate limited, trying ${fallbackModel}`);
			continue;
		}

		// If fallback also rate limited, wait and retry once
		if (res.status === 429 && model === fallbackModel) {
			console.log(`[Groq] Both models rate limited, waiting 5s and retrying ${fallbackModel}`);
			await new Promise(r => setTimeout(r, 5000));
			res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: fallbackModel,
					messages,
					temperature: 0.7,
					max_completion_tokens: 1024,
					stream: true
				})
			});
			break;
		}

		break;
	}

	if (!res || !res.ok) {
		// Return a friendly bot message instead of an error
		const fallbackMessage = "I'm a little busy right now — give me a moment and try again!";
		const encoder = new TextEncoder();
		const messageId = crypto.randomUUID();
		const events = [
			`data: ${JSON.stringify({ event: 'message', answer: fallbackMessage, message_id: messageId, conversation_id: '' })}\n\n`,
			`data: ${JSON.stringify({ event: 'message_end', message_id: messageId, conversation_id: '' })}\n\n`
		];
		return new Response(events.join(''), {
			headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
		});
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
				console.error('[Groq stream error]', err);
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
}
