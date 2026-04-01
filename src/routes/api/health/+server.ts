import { env } from '$env/dynamic/private';
import { search } from '$lib/server/rag';
import { searchTix } from '$lib/server/rag-tix';
import { serverLog } from '$lib/server/server-log';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const checks: Record<string, string> = { server: 'ok' };

	// Check Groq API (organizer)
	try {
		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` }
		});
		checks.groq_organizer = res.ok ? 'ok' : `error (${res.status})`;
	} catch {
		checks.groq_organizer = 'unreachable';
	}

	// Check Groq API (tix)
	try {
		const res = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { 'Authorization': `Bearer ${env.TIX_GROQ_API_KEY}` }
		});
		checks.groq_tix = res.ok ? 'ok' : `error (${res.status})`;
	} catch {
		checks.groq_tix = 'unreachable';
	}

	// Check knowledge bases
	try {
		checks.kb_organizer = search('test', 1).length > 0 ? 'ok' : 'empty';
	} catch {
		checks.kb_organizer = 'error';
	}

	try {
		checks.kb_tix = searchTix('test', 1).length > 0 ? 'ok' : 'empty';
	} catch {
		checks.kb_tix = 'error';
	}

	const allOk = Object.values(checks).every(v => v === 'ok');

	if (!allOk) {
		const failing = Object.entries(checks).filter(([, v]) => v !== 'ok').map(([k, v]) => `${k}=${v}`).join(', ');
		serverLog('warn', 'health', `Health check degraded: ${failing}`);
	}

	return new Response(JSON.stringify({ status: allOk ? 'healthy' : 'degraded', checks }), {
		status: allOk ? 200 : 503,
		headers: { 'Content-Type': 'application/json' }
	});
};
