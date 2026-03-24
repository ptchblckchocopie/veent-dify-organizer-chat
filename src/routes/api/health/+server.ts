import { env } from '$env/dynamic/private';
import { search } from '$lib/server/rag';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const checks: Record<string, string> = { server: 'ok' };

	// Check Groq API
	try {
		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` }
		});
		checks.groq = res.ok ? 'ok' : `error (${res.status})`;
	} catch {
		checks.groq = 'unreachable';
	}

	// Check knowledge base loaded
	try {
		const results = search('test', 1);
		checks.knowledge_base = results.length > 0 ? 'ok' : 'empty';
	} catch {
		checks.knowledge_base = 'error';
	}

	// Check Tix bot Dify API
	try {
		const res = await fetch(`${env.DIFY_API_URL}/parameters`, {
			headers: { 'Authorization': `Bearer ${env.TIX_DIFY_API_KEY}` }
		});
		checks.dify_tix = res.ok ? 'ok' : `error (${res.status})`;
	} catch {
		checks.dify_tix = 'unreachable';
	}

	const allOk = Object.values(checks).every(v => v === 'ok');

	return new Response(JSON.stringify({ status: allOk ? 'healthy' : 'degraded', checks }), {
		status: allOk ? 200 : 503,
		headers: { 'Content-Type': 'application/json' }
	});
};
