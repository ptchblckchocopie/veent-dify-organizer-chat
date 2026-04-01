import type { Handle } from '@sveltejs/kit';
import { isRateLimited } from '$lib/server/rate-limit';
import { serverLog } from '$lib/server/server-log';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Rate limit API routes only
	if (pathname.startsWith('/api/')) {
		const ip = event.getClientAddress();
		const { limited, remaining, retryAfter } = isRateLimited(ip);

		if (limited) {
			serverLog('warn', 'rate-limit', `Client rate limited on ${pathname}`, `Retry after ${retryAfter}s`);
			return new Response(
				JSON.stringify({ error: 'Too many requests. Please slow down.' }),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': String(retryAfter),
						'X-RateLimit-Remaining': '0'
					}
				}
			);
		}

		const response = await resolve(event);

		// Clone headers from response and add rate limit info
		const headers = new Headers(response.headers);
		headers.set('X-RateLimit-Remaining', String(remaining));

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}

	const response = await resolve(event);

	// Security headers for all responses
	const headers = new Headers(response.headers);
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('X-Frame-Options', 'SAMEORIGIN');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};
