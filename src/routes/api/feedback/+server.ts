import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { message_id, rating } = await request.json();

	if (!message_id || !['like', 'dislike', null].includes(rating)) {
		return new Response(
			JSON.stringify({ error: 'Invalid request' }),
			{ status: 400 }
		);
	}

	const res = await fetch(
		`${env.DIFY_API_URL}/messages/${encodeURIComponent(message_id)}/feedbacks`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.DIFY_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				rating,
				user: 'organizer-user'
			})
		}
	);

	if (!res.ok) {
		const err = await res.text();
		return new Response(
			JSON.stringify({ error: err }),
			{ status: res.status }
		);
	}

	const result = await res.json();
	return new Response(JSON.stringify(result));
};
