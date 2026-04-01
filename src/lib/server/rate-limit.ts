const windowMs = 60 * 1000; // 1 minute window
const maxRequests = 20; // max requests per window per IP

interface Entry {
	count: number;
	resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (now > entry.resetAt) store.delete(key);
	}
}, 5 * 60 * 1000);

export function isRateLimited(ip: string): { limited: boolean; remaining: number; retryAfter: number } {
	const now = Date.now();
	const entry = store.get(ip);

	if (!entry || now > entry.resetAt) {
		store.set(ip, { count: 1, resetAt: now + windowMs });
		return { limited: false, remaining: maxRequests - 1, retryAfter: 0 };
	}

	entry.count++;

	if (entry.count > maxRequests) {
		const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
		return { limited: true, remaining: 0, retryAfter };
	}

	return { limited: false, remaining: maxRequests - entry.count, retryAfter: 0 };
}

export function getRateLimitStats() {
	const now = Date.now();
	let activeClients = 0;
	let totalRequests = 0;
	let limitedClients = 0;

	for (const [, entry] of store) {
		if (now <= entry.resetAt) {
			activeClients++;
			totalRequests += entry.count;
			if (entry.count > maxRequests) limitedClients++;
		}
	}

	return {
		activeClients,
		totalRequests,
		limitedClients,
		maxRequestsPerMinute: maxRequests,
		windowMs
	};
}
