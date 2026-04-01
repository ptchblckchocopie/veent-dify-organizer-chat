import { env } from '$env/dynamic/private';
import { search } from '$lib/server/rag';
import { searchTix } from '$lib/server/rag-tix';
import { getMetricsSummary } from '$lib/server/metrics';
import { getRecentLogs, getLogStats } from '$lib/server/logger';
import { getRateLimitStats } from '$lib/server/rate-limit';
import { getServerLogs, getServerLogsSummary } from '$lib/server/server-log';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const secret = url.searchParams.get('secret');
	if (secret !== env.ANALYTICS_SECRET) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Health checks
	const checks: Record<string, string> = { server: 'ok' };

	const [groqOrg, groqTix] = await Promise.all([
		fetch('https://api.groq.com/openai/v1/models', {
			headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
			signal: AbortSignal.timeout(5000)
		}).then(r => r.ok ? 'ok' : `error (${r.status})`).catch(() => 'unreachable'),
		fetch('https://api.groq.com/openai/v1/models', {
			headers: { 'Authorization': `Bearer ${env.TIX_GROQ_API_KEY}` },
			signal: AbortSignal.timeout(5000)
		}).then(r => r.ok ? 'ok' : `error (${r.status})`).catch(() => 'unreachable')
	]);

	checks.groq_organizer = groqOrg;
	checks.groq_tix = groqTix;

	try {
		checks.kb_organizer = search('test', 1).length > 0 ? 'ok' : 'empty';
	} catch { checks.kb_organizer = 'error'; }

	try {
		checks.kb_tix = searchTix('test', 1).length > 0 ? 'ok' : 'empty';
	} catch { checks.kb_tix = 'error'; }

	const allOk = Object.values(checks).every(v => v === 'ok');

	return new Response(JSON.stringify({
		health: { status: allOk ? 'healthy' : 'degraded', checks },
		metrics: getMetricsSummary(),
		logs: getRecentLogs(100),
		logStats: getLogStats(),
		rateLimit: getRateLimitStats(),
		serverLogs: getServerLogs(200),
		serverLogsSummary: getServerLogsSummary(),
		serverTime: new Date().toISOString()
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
};
