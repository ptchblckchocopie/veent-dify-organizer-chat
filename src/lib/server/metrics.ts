export interface ChatMetric {
	timestamp: number;
	bot: 'organizer' | 'tix';
	responseTimeMs: number;
	model: string;
	fallbackIndex: number;
	success: boolean;
}

const recentMetrics: ChatMetric[] = [];
const MAX_ENTRIES = 500;

export function recordMetric(m: ChatMetric) {
	recentMetrics.push(m);
	if (recentMetrics.length > MAX_ENTRIES) recentMetrics.shift();
}

export function getMetrics(): ChatMetric[] {
	return [...recentMetrics];
}

export function getMetricsSummary() {
	const now = Date.now();
	const last24h = recentMetrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);
	const lastHour = recentMetrics.filter(m => now - m.timestamp < 60 * 60 * 1000);

	function summarize(metrics: ChatMetric[]) {
		if (metrics.length === 0) {
			return { count: 0, avgResponseMs: 0, minResponseMs: 0, maxResponseMs: 0, successRate: '0%', byBot: {}, byModel: {} as Record<string, number>, fallbackRate: '0%' };
		}

		const times = metrics.map(m => m.responseTimeMs);
		const successes = metrics.filter(m => m.success).length;
		const fallbacks = metrics.filter(m => m.fallbackIndex > 0).length;

		const byBot: Record<string, { count: number; avgMs: number }> = {};
		for (const bot of ['organizer', 'tix'] as const) {
			const botMetrics = metrics.filter(m => m.bot === bot);
			if (botMetrics.length > 0) {
				const botTimes = botMetrics.map(m => m.responseTimeMs);
				byBot[bot] = {
					count: botMetrics.length,
					avgMs: Math.round(botTimes.reduce((a, b) => a + b, 0) / botTimes.length)
				};
			}
		}

		const byModel: Record<string, number> = {};
		for (const m of metrics) {
			byModel[m.model] = (byModel[m.model] || 0) + 1;
		}

		return {
			count: metrics.length,
			avgResponseMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
			minResponseMs: Math.round(Math.min(...times)),
			maxResponseMs: Math.round(Math.max(...times)),
			successRate: ((successes / metrics.length) * 100).toFixed(1) + '%',
			byBot,
			byModel,
			fallbackRate: ((fallbacks / metrics.length) * 100).toFixed(1) + '%'
		};
	}

	return {
		allTime: summarize(recentMetrics),
		last24h: summarize(last24h),
		lastHour: summarize(lastHour),
		recentRequests: recentMetrics.slice(-50).reverse()
	};
}
