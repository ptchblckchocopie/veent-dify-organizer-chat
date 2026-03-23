import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const checks: Record<string, string> = { server: 'ok' };

	try {
		const res = await fetch(`${env.DIFY_API_URL}/parameters`, {
			headers: { 'Authorization': `Bearer ${env.DIFY_API_KEY}` }
		});
		checks.dify_organizer = res.ok ? 'ok' : `error (${res.status})`;
	} catch {
		checks.dify_organizer = 'unreachable';
	}

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
