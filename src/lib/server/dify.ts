import { env } from '$env/dynamic/private';

const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, options);

			// Don't retry client errors (4xx), only server errors (5xx)
			if (res.ok || (res.status >= 400 && res.status < 500)) {
				return res;
			}

			if (attempt < retries) {
				const delay = BASE_DELAY * Math.pow(2, attempt);
				await new Promise(r => setTimeout(r, delay));
				continue;
			}

			return res;
		} catch (err) {
			if (attempt < retries) {
				const delay = BASE_DELAY * Math.pow(2, attempt);
				await new Promise(r => setTimeout(r, delay));
				continue;
			}
			throw err;
		}
	}

	throw new Error('Max retries exceeded');
}

export async function sendChatMessage(
	message: string,
	conversationId: string,
	apiKey: string,
	user: string
): Promise<Response> {
	const res = await fetchWithRetry(`${env.DIFY_API_URL}/chat-messages`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			inputs: {},
			query: message,
			response_mode: 'streaming',
			conversation_id: conversationId || '',
			user
		})
	});

	if (!res.ok) {
		const err = await res.text();
		return new Response(JSON.stringify({ error: err }), { status: res.status });
	}

	return new Response(res.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
}

export async function sendFeedback(
	messageId: string,
	rating: 'like' | 'dislike' | null,
	apiKey: string,
	user: string
): Promise<Response> {
	if (!messageId || !['like', 'dislike', null].includes(rating)) {
		return new Response(
			JSON.stringify({ error: 'Invalid request' }),
			{ status: 400 }
		);
	}

	const res = await fetchWithRetry(
		`${env.DIFY_API_URL}/messages/${encodeURIComponent(messageId)}/feedbacks`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ rating, user })
		}
	);

	if (!res.ok) {
		const err = await res.text();
		return new Response(JSON.stringify({ error: err }), { status: res.status });
	}

	const result = await res.json();
	return new Response(JSON.stringify(result));
}
