import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

async function difyGet(path: string, params: Record<string, string>) {
	const url = new URL(`${env.DIFY_API_URL}${path}`);
	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

	const res = await fetch(url.toString(), {
		headers: { 'Authorization': `Bearer ${env.DIFY_API_KEY}` },
		signal: AbortSignal.timeout(10000)
	});
	if (!res.ok) throw new Error(`Dify API error: ${res.status}`);
	return res.json();
}

export const GET: RequestHandler = async ({ url }) => {
	const secret = url.searchParams.get('secret');
	if (secret !== env.ANALYTICS_SECRET) {
		return new Response('Unauthorized', { status: 401 });
	}

	const user = 'organizer-user';
	const maxConversations = parseInt(url.searchParams.get('limit') || '50');

	try {
		// Fetch recent conversations (capped)
		const allConversations: any[] = [];
		let lastId = '';
		let hasMore = true;

		while (hasMore && allConversations.length < maxConversations) {
			const remaining = maxConversations - allConversations.length;
			const params: Record<string, string> = {
				user,
				limit: String(Math.min(remaining, 100)),
				sort_by: '-updated_at'
			};
			if (lastId) params.last_id = lastId;

			const data = await difyGet('/conversations', params);
			allConversations.push(...data.data);
			hasMore = data.has_more;
			if (data.data.length > 0) {
				lastId = data.data[data.data.length - 1].id;
			} else {
				break;
			}
		}

		// For each conversation, fetch first page of messages only
		const allMessages: any[] = [];
		for (const conv of allConversations) {
			try {
				const data = await difyGet('/messages', {
					conversation_id: conv.id,
					user,
					limit: '100'
				});
				allMessages.push(...data.data.map((m: any) => ({
					...m,
					conversation_name: conv.name
				})));
			} catch {
				// Skip conversations that fail to fetch
			}
		}

		// Compute analytics
		const totalConversations = allConversations.length;
		const totalMessages = allMessages.length;

		const likes = allMessages.filter((m: any) => m.feedback?.rating === 'like').length;
		const dislikes = allMessages.filter((m: any) => m.feedback?.rating === 'dislike').length;

		// Group questions by frequency
		const questionCounts: Record<string, { original: string; count: number }> = {};
		for (const m of allMessages) {
			if (m.query) {
				const normalized = m.query.trim().toLowerCase();
				if (!questionCounts[normalized]) {
					questionCounts[normalized] = { original: m.query.trim(), count: 0 };
				}
				questionCounts[normalized].count++;
			}
		}
		const topQuestions = Object.values(questionCounts)
			.sort((a, b) => b.count - a.count)
			.slice(0, 30)
			.map(({ original, count }) => ({ question: original, count }));

		// Messages with negative feedback
		const negativeMessages = allMessages
			.filter((m: any) => m.feedback?.rating === 'dislike')
			.map((m: any) => ({
				question: m.query,
				answer: m.answer?.slice(0, 300),
				conversation_id: m.conversation_id,
				created_at: m.created_at
			}));

		// Messages with no good answer (bot declined)
		const declinedMessages = allMessages
			.filter((m: any) => m.answer && (
				m.answer.includes("I don't have details on that") ||
				m.answer.includes("Veent support can help") ||
				m.answer.includes("I wish I could help")
			))
			.map((m: any) => ({
				question: m.query,
				answer: m.answer?.slice(0, 300),
				created_at: m.created_at
			}));

		// Daily activity
		const dailyCounts: Record<string, number> = {};
		for (const m of allMessages) {
			if (m.created_at) {
				const day = new Date(m.created_at * 1000).toISOString().split('T')[0];
				dailyCounts[day] = (dailyCounts[day] || 0) + 1;
			}
		}

		return new Response(JSON.stringify({
			summary: {
				total_conversations: totalConversations,
				total_messages: totalMessages,
				likes,
				dislikes,
				feedback_rate: totalMessages > 0
					? ((likes + dislikes) / totalMessages * 100).toFixed(1) + '%'
					: '0%',
				satisfaction_rate: (likes + dislikes) > 0
					? (likes / (likes + dislikes) * 100).toFixed(1) + '%'
					: 'N/A'
			},
			top_questions: topQuestions,
			negative_feedback: negativeMessages,
			declined_answers: declinedMessages,
			daily_activity: dailyCounts,
			conversations: allConversations.map((c: any) => ({
				id: c.id,
				name: c.name,
				created_at: c.created_at,
				updated_at: c.updated_at
			}))
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		return new Response(JSON.stringify({
			error: 'Failed to fetch analytics',
			detail: String(err)
		}), { status: 500 });
	}
};
