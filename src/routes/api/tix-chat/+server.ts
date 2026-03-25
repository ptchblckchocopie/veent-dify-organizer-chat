import { searchTix, formatTixContext } from '$lib/server/rag-tix';
import { streamTixChat } from '$lib/server/groq-tix';
import { logChat } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { message, conversation_id, history } = await request.json();

	logChat({ bot: 'tix', ip: getClientAddress(), query: message, conversationId: conversation_id || '' });

	const chunks = searchTix(message, 5);
	const context = formatTixContext(chunks);

	return streamTixChat(message, context, history || []);
};
