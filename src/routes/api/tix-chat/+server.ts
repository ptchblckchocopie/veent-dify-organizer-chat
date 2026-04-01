import { searchTix, formatTixContext } from '$lib/server/rag-tix';
import { streamTixChat } from '$lib/server/groq-tix';
import { logChat } from '$lib/server/logger';
import { recordMetric } from '$lib/server/metrics';
import { serverLog } from '$lib/server/server-log';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const { message, conversation_id, history } = await request.json();

		logChat({ bot: 'tix', ip: getClientAddress(), query: message, conversationId: conversation_id || '' });
		serverLog('info', 'chat', `Tix query: "${message.slice(0, 80)}"`);

		const chunks = searchTix(message, 5);
		const context = formatTixContext(chunks);

		const start = Date.now();
		const { response, model, fallbackIndex, success } = await streamTixChat(message, context, history || []);
		const elapsed = Date.now() - start;

		recordMetric({
			timestamp: Date.now(),
			bot: 'tix',
			responseTimeMs: elapsed,
			model,
			fallbackIndex,
			success
		});

		serverLog('info', 'chat', `Tix response: ${model} in ${elapsed}ms${fallbackIndex > 0 ? ` (fallback #${fallbackIndex})` : ''}${!success ? ' [FAILED]' : ''}`);

		return response;
	} catch (err) {
		serverLog('error', 'chat', 'Tix endpoint error', { error: err });
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
	}
};
