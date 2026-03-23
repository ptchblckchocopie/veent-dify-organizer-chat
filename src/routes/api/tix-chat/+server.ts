import { env } from '$env/dynamic/private';
import { sendChatMessage } from '$lib/server/dify';
import { logChat } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { message, conversation_id } = await request.json();
	logChat({ bot: 'tix', ip: getClientAddress(), query: message, conversationId: conversation_id });
	return sendChatMessage(message, conversation_id, env.TIX_DIFY_API_KEY, 'tix-user');
};
