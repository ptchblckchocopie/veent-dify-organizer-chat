import { env } from '$env/dynamic/private';
import { sendFeedback } from '$lib/server/dify';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { message_id, rating } = await request.json();
	return sendFeedback(message_id, rating, env.TIX_DIFY_API_KEY, 'tix-user');
};
