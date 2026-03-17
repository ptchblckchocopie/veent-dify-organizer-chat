<script lang="ts">
	import { Bot, ThumbsUp, ThumbsDown, MessageSquare, Users, AlertTriangle, TrendingDown } from 'lucide-svelte';

	let { data } = $props();
	const { analytics } = data;
	const { summary, top_questions, negative_feedback, declined_answers, daily_activity } = analytics;

	const sortedDays = Object.entries(daily_activity as Record<string, number>)
		.sort(([a], [b]) => b.localeCompare(a))
		.slice(0, 14);
</script>

<svelte:head>
	<title>Vee Analytics</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 md:p-8">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<div class="flex items-center gap-3 mb-8">
			<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E21D48] to-[#B80A23] flex items-center justify-center">
				<Bot class="w-5 h-5 text-white" />
			</div>
			<div>
				<h1 class="text-2xl font-bold">Vee Analytics</h1>
				<p class="text-sm text-zinc-500">Organizer Dashboard Assistant</p>
			</div>
		</div>

		<!-- Summary Cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
				<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
					<Users class="w-3.5 h-3.5" />
					Conversations
				</div>
				<div class="text-2xl font-bold">{summary.total_conversations}</div>
			</div>
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
				<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
					<MessageSquare class="w-3.5 h-3.5" />
					Messages
				</div>
				<div class="text-2xl font-bold">{summary.total_messages}</div>
			</div>
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
				<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
					<ThumbsUp class="w-3.5 h-3.5 text-green-500" />
					Satisfaction
				</div>
				<div class="text-2xl font-bold">{summary.satisfaction_rate}</div>
				<div class="text-xs text-zinc-500 mt-1">
					{summary.likes} likes · {summary.dislikes} dislikes
				</div>
			</div>
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
				<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
					<TrendingDown class="w-3.5 h-3.5" />
					Feedback Rate
				</div>
				<div class="text-2xl font-bold">{summary.feedback_rate}</div>
			</div>
		</div>

		<!-- Two Column Layout -->
		<div class="grid md:grid-cols-2 gap-6 mb-8">
			<!-- Top Questions -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<h2 class="text-sm font-semibold mb-4 text-zinc-300">Top Questions</h2>
				{#if top_questions.length === 0}
					<p class="text-sm text-zinc-500">No data yet</p>
				{:else}
					<div class="space-y-2 max-h-[400px] overflow-y-auto">
						{#each top_questions as q, i}
							<div class="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
								<span class="text-xs font-mono text-zinc-600 mt-0.5 w-5 shrink-0">{i + 1}</span>
								<span class="text-sm text-zinc-300 flex-1">{q.question}</span>
								<span class="text-xs font-mono text-zinc-500 shrink-0 bg-zinc-800 px-2 py-0.5 rounded">{q.count}x</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Daily Activity -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<h2 class="text-sm font-semibold mb-4 text-zinc-300">Daily Activity (Last 14 Days)</h2>
				{#if sortedDays.length === 0}
					<p class="text-sm text-zinc-500">No data yet</p>
				{:else}
					<div class="space-y-2">
						{#each sortedDays as [day, count]}
							{@const maxCount = Math.max(...sortedDays.map(([, c]) => c))}
							<div class="flex items-center gap-3">
								<span class="text-xs font-mono text-zinc-500 w-20 shrink-0">{day}</span>
								<div class="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
									<div
										class="h-full rounded bg-gradient-to-r from-[#E21D48] to-[#B80A23]"
										style="width: {maxCount > 0 ? (count / maxCount) * 100 : 0}%"
									></div>
								</div>
								<span class="text-xs font-mono text-zinc-500 w-8 text-right">{count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Negative Feedback — Most Actionable -->
		<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
			<div class="flex items-center gap-2 mb-4">
				<ThumbsDown class="w-4 h-4 text-red-400" />
				<h2 class="text-sm font-semibold text-zinc-300">Negative Feedback</h2>
				<span class="text-xs text-zinc-500">— fix these in the KB</span>
			</div>
			{#if negative_feedback.length === 0}
				<p class="text-sm text-zinc-500">No negative feedback yet — great!</p>
			{:else}
				<div class="space-y-4 max-h-[500px] overflow-y-auto">
					{#each negative_feedback as msg}
						<div class="border border-red-900/30 bg-red-950/20 rounded-lg p-4">
							<div class="text-xs text-zinc-500 mb-2">
								{new Date(msg.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</div>
							<div class="text-sm font-medium text-zinc-200 mb-2">Q: {msg.question}</div>
							<div class="text-sm text-zinc-400 whitespace-pre-wrap">A: {msg.answer}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Declined Answers — Content Gaps -->
		<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
			<div class="flex items-center gap-2 mb-4">
				<AlertTriangle class="w-4 h-4 text-amber-400" />
				<h2 class="text-sm font-semibold text-zinc-300">Declined Answers</h2>
				<span class="text-xs text-zinc-500">— content gaps in the KB</span>
			</div>
			{#if declined_answers.length === 0}
				<p class="text-sm text-zinc-500">No declined answers — KB coverage is good!</p>
			{:else}
				<div class="space-y-4 max-h-[500px] overflow-y-auto">
					{#each declined_answers as msg}
						<div class="border border-amber-900/30 bg-amber-950/20 rounded-lg p-4">
							<div class="text-xs text-zinc-500 mb-2">
								{new Date(msg.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</div>
							<div class="text-sm font-medium text-zinc-200 mb-2">Q: {msg.question}</div>
							<div class="text-sm text-zinc-400 whitespace-pre-wrap">A: {msg.answer}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="text-center text-xs text-zinc-600 pb-8">
			Vee Analytics · Veent Organizer Dashboard Assistant
		</div>
	</div>
</div>
