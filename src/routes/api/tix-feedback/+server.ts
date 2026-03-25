import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	// Feedback is logged client-side now, no Dify to forward to
	return new Response(JSON.stringify({ result: 'success' }));
};
