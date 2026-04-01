import { search, formatContext } from '$lib/server/rag';
import { streamChat } from '$lib/server/groq';
import { logChat } from '$lib/server/logger';
import { recordMetric } from '$lib/server/metrics';
import { serverLog } from '$lib/server/server-log';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const { message, conversation_id, history } = await request.json();

		logChat({ bot: 'organizer', ip: getClientAddress(), query: message, conversationId: conversation_id || '' });
		serverLog('info', 'chat', `Organizer query: "${message.slice(0, 80)}"`);

		// Search knowledge base for relevant context
		const chunks = search(message, 5);
		const context = formatContext(chunks);

		const start = Date.now();
		const { response, model, fallbackIndex, success } = await streamChat(message, context, history || []);
		const elapsed = Date.now() - start;

		recordMetric({
			timestamp: Date.now(),
			bot: 'organizer',
			responseTimeMs: elapsed,
			model,
			fallbackIndex,
			success
		});

		serverLog('info', 'chat', `Organizer response: ${model} in ${elapsed}ms${fallbackIndex > 0 ? ` (fallback #${fallbackIndex})` : ''}${!success ? ' [FAILED]' : ''}`);

		return response;
	} catch (err) {
		serverLog('error', 'chat', 'Organizer endpoint error', { error: err });
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
	}
};
