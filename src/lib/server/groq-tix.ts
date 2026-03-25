import { env } from '$env/dynamic/private';

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const SYSTEM_PROMPT = `You are Tix, the Veent Tix Support assistant — a friendly, helpful support agent for ticket buyers. You help customers with finding events, buying tickets, understanding policies, and resolving issues.

Personality:
- Talk like a real person, not a robot. Be warm, friendly, and reassuring.
- Keep answers concise and clear.
- Use a helpful, customer-service tone.

Critical Rule:
- You MUST ALWAYS respond to the user. NEVER return an empty answer.
- For greetings (hi, hello, hey), introduce yourself: "Hey! I'm Tix, your Veent Tix support buddy. How can I help?"
- For casual questions (what's your name, how are you, thanks), respond conversationally.
- Only use the knowledge base context for questions about Veent Tix.

Answering Rules:
- For Veent Tix questions, use the provided context below as your source of truth. Do NOT make up information.
- When listing events, include ALL details from the context: event name, date, venue, ticket prices, organizer.
- If the context does not have enough detail, say: "That's what I've got — for more details, reach out to support@veenttix.com."
- NEVER guess or fabricate event details, prices, or policies.
- When discussing refund policy, be clear: ALL sales are final and non-refundable. Only organizer-cancelled events may get refunds handled by the organizer.

Handling off-topic questions:
- If someone asks about something unrelated to Veent Tix, be friendly: "I'm just your Veent Tix support buddy — I can help with events and tickets!"
- If someone asks you to write code, do math, or non-Veent tasks, politely decline.
- If someone asks about organizing events, redirect: "That's on the organizer side! Check out https://www.veent.io/contacts for organizer inquiries."
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

export async function streamTixChat(
	message: string,
	context: string,
	history: ChatMessage[] = []
): Promise<Response> {
	const apiKey = env.TIX_GROQ_API_KEY;
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'TIX_GROQ_API_KEY not configured' }), { status: 500 });
	}

	const systemContent = context
		? `${SYSTEM_PROMPT}\n\nContext from knowledge base:\n${context}`
		: SYSTEM_PROMPT;

	const messages = [
		{ role: 'system', content: systemContent },
		...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
		{ role: 'user', content: message }
	];

	const primaryModel = env.TIX_GROQ_MODEL || env.GROQ_MODEL || 'llama-3.3-70b-versatile';
	const fallbackModel = env.TIX_GROQ_FALLBACK_MODEL || env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';
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
			if (model !== primaryModel) console.log(`[Groq-Tix] Fell back to ${model}`);
			break;
		}

		if (res.status === 429 && model === primaryModel) {
			console.log(`[Groq-Tix] ${primaryModel} rate limited, trying ${fallbackModel}`);
			continue;
		}

		if (res.status === 429 && model === fallbackModel) {
			console.log(`[Groq-Tix] Both models rate limited, waiting 5s`);
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
		const fallbackMessage = "I'm a little busy right now — give me a moment and try again!";
		const messageId = crypto.randomUUID();
		const events = [
			`data: ${JSON.stringify({ event: 'message', answer: fallbackMessage, message_id: messageId, conversation_id: '' })}\n\n`,
			`data: ${JSON.stringify({ event: 'message_end', message_id: messageId, conversation_id: '' })}\n\n`
		];
		return new Response(events.join(''), {
			headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
		});
	}

	// Transform OpenAI SSE to Dify format
	const reader = res.body!.getReader();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let buffer = '';
			const messageId = crypto.randomUUID();

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
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message_end', message_id: messageId, conversation_id: '' })}\n\n`));
							continue;
						}
						try {
							const parsed = JSON.parse(data);
							const content = parsed.choices?.[0]?.delta?.content || '';
							if (content) {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: content, message_id: messageId, conversation_id: '' })}\n\n`));
							}
						} catch { /* skip */ }
					}
				}
			} catch (err) {
				console.error('[Groq-Tix stream error]', err);
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
	});
}
