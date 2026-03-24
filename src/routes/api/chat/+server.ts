import { search, formatContext } from '$lib/server/rag';
import { streamChat } from '$lib/server/groq';
import { logChat } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { message, conversation_id, history } = await request.json();

	logChat({ bot: 'organizer', ip: getClientAddress(), query: message, conversationId: conversation_id || '' });

	// Search knowledge base for relevant context
	const chunks = search(message, 5);
	const context = formatContext(chunks);

	return streamChat(message, context, history || []);
};
