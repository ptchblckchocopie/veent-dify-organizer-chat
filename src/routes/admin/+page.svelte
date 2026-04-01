<script lang="ts">
	import {
		Activity, Bot, Shield, Clock, Cpu, MessageSquare,
		Zap, AlertTriangle, CheckCircle, XCircle, RefreshCw,
		Terminal, Filter, Info, TriangleAlert, CircleX,
		ChevronRight, ChevronDown, Copy, Check
	} from 'lucide-svelte';

	let { data } = $props();
	let admin = $state(data.admin);
	let lastRefresh = $state(new Date().toLocaleTimeString());
	let refreshing = $state(false);
	let autoRefresh = $state(true);

	// Server log filters
	let logLevelFilter = $state<string>('all');
	let logSourceFilter = $state<string>('all');

	// Expanded log entries
	let expandedLogIds = $state<Set<number>>(new Set());
	let copiedLogId = $state<number | null>(null);

	function toggleLogExpand(id: number) {
		const next = new Set(expandedLogIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedLogIds = next;
	}

	function hasExpandableContent(entry: any): boolean {
		return !!(entry.details || entry.stack || (entry.context && Object.keys(entry.context).length > 0));
	}

	function formatFullLog(entry: any): string {
		const lines: string[] = [];
		lines.push(`=== Server Log #${entry.id} ===`);
		lines.push(`Timestamp: ${entry.timestamp}`);
		lines.push(`Level:     ${entry.level.toUpperCase()}`);
		lines.push(`Source:    ${entry.source}`);
		lines.push(`Message:   ${entry.message}`);
		if (entry.details) {
			lines.push('');
			lines.push(`Details: ${entry.details}`);
		}
		if (entry.stack) {
			lines.push('');
			lines.push('Stack Trace:');
			lines.push(entry.stack);
		}
		if (entry.context && Object.keys(entry.context).length > 0) {
			lines.push('');
			lines.push('Context:');
			lines.push(JSON.stringify(entry.context, null, 2));
		}
		lines.push('');
		return lines.join('\n');
	}

	async function copyLogToClipboard(entry: any) {
		try {
			await navigator.clipboard.writeText(formatFullLog(entry));
			copiedLogId = entry.id;
			setTimeout(() => { copiedLogId = null; }, 2000);
		} catch {
			// Fallback for HTTP contexts
			const textarea = document.createElement('textarea');
			textarea.value = formatFullLog(entry);
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			copiedLogId = entry.id;
			setTimeout(() => { copiedLogId = null; }, 2000);
		}
	}

	async function copyAllFilteredLogs() {
		const text = filteredServerLogs.slice(0, 100).map(formatFullLog).join('\n---\n\n');
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		}
	}

	const { health, metrics, logs, logStats, rateLimit, serverLogs, serverLogsSummary } = $derived(admin);

	const filteredServerLogs = $derived(
		(serverLogs || []).filter((entry: any) => {
			if (logLevelFilter !== 'all' && entry.level !== logLevelFilter) return false;
			if (logSourceFilter !== 'all' && entry.source !== logSourceFilter) return false;
			return true;
		})
	);

	const logSources = $derived(
		[...new Set((serverLogs || []).map((e: any) => e.source))].sort()
	);

	// Auto-refresh every 30s
	$effect(() => {
		if (!autoRefresh) return;
		const interval = setInterval(async () => {
			await refresh();
		}, 30000);
		return () => clearInterval(interval);
	});

	async function refresh() {
		refreshing = true;
		try {
			const res = await fetch(`/api/admin?secret=${encodeURIComponent(data.secret)}`);
			if (res.ok) {
				admin = await res.json();
				lastRefresh = new Date().toLocaleTimeString();
			}
		} catch { /* silent */ }
		refreshing = false;
	}

	function statusColor(status: string): string {
		if (status === 'ok' || status === 'healthy') return 'text-emerald-400';
		if (status === 'degraded') return 'text-amber-400';
		return 'text-red-400';
	}

	function statusBg(status: string): string {
		if (status === 'ok' || status === 'healthy') return 'bg-emerald-500/10 border-emerald-500/20';
		if (status === 'degraded') return 'bg-amber-500/10 border-amber-500/20';
		return 'bg-red-500/10 border-red-500/20';
	}

	function formatMs(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function shortModel(model: string): string {
		return model.replace('meta-llama/', '').replace('openai/', '');
	}

	function levelColor(level: string): string {
		if (level === 'error') return 'text-red-400';
		if (level === 'warn') return 'text-amber-400';
		return 'text-sky-400';
	}

	function levelBg(level: string): string {
		if (level === 'error') return 'bg-red-500/10 text-red-400';
		if (level === 'warn') return 'bg-amber-500/10 text-amber-400';
		return 'bg-sky-500/10 text-sky-400';
	}

	function sourceBg(source: string): string {
		const colors: Record<string, string> = {
			'groq': 'bg-violet-500/10 text-violet-400',
			'groq-tix': 'bg-rose-500/10 text-rose-400',
			'rag': 'bg-teal-500/10 text-teal-400',
			'rag-tix': 'bg-pink-500/10 text-pink-400',
			'rate-limit': 'bg-amber-500/10 text-amber-400',
			'server': 'bg-zinc-500/10 text-zinc-400',
			'chat': 'bg-indigo-500/10 text-indigo-400',
			'health': 'bg-emerald-500/10 text-emerald-400',
		};
		return colors[source] || 'bg-zinc-500/10 text-zinc-400';
	}

	const sortedDays = $derived(
		Object.entries(logStats.dailyCounts as Record<string, { organizer: number; tix: number }>)
			.sort(([a], [b]) => b.localeCompare(a))
			.slice(0, 14)
	);

	const maxDayTotal = $derived(
		Math.max(...sortedDays.map(([, c]) => c.organizer + c.tix), 1)
	);
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
					<Activity class="w-5 h-5 text-white" />
				</div>
				<div>
					<h1 class="text-2xl font-bold">Admin Dashboard</h1>
					<p class="text-sm text-zinc-500">Veent Bot Monitoring</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-xs text-zinc-500">Last: {lastRefresh}</span>
				<button
					onclick={() => autoRefresh = !autoRefresh}
					class="text-xs px-2.5 py-1.5 rounded-lg border transition-colors {autoRefresh ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}"
				>
					{autoRefresh ? 'Auto 30s' : 'Paused'}
				</button>
				<button
					onclick={refresh}
					disabled={refreshing}
					class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50"
				>
					<RefreshCw class="w-3 h-3 {refreshing ? 'animate-spin' : ''}" />
					Refresh
				</button>
			</div>
		</div>

		<!-- Health Status -->
		<div class="mb-6">
			<h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Health Status</h2>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
				<div class="rounded-xl border p-4 {statusBg(health.status)}">
					<div class="flex items-center gap-2 mb-2">
						{#if health.status === 'healthy'}
							<CheckCircle class="w-4 h-4 text-emerald-400" />
						{:else}
							<AlertTriangle class="w-4 h-4 text-amber-400" />
						{/if}
						<span class="text-xs font-medium text-zinc-400">Overall</span>
					</div>
					<div class="text-lg font-bold {statusColor(health.status)} capitalize">{health.status}</div>
				</div>
				{#each Object.entries(health.checks) as [name, status]}
					<div class="rounded-xl border p-4 {statusBg(status as string)}">
						<div class="flex items-center gap-2 mb-2">
							{#if status === 'ok'}
								<CheckCircle class="w-3.5 h-3.5 text-emerald-400" />
							{:else}
								<XCircle class="w-3.5 h-3.5 text-red-400" />
							{/if}
							<span class="text-xs font-medium text-zinc-400">{name.replace(/_/g, ' ')}</span>
						</div>
						<div class="text-sm font-semibold {statusColor(status as string)}">{status}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Metrics Summary Cards -->
		<div class="mb-6">
			<h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Performance (Last Hour)</h2>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
					<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
						<Zap class="w-3.5 h-3.5" />
						Requests
					</div>
					<div class="text-2xl font-bold">{metrics.lastHour.count}</div>
					<div class="text-xs text-zinc-500 mt-1">{metrics.last24h.count} in 24h</div>
				</div>
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
					<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
						<Clock class="w-3.5 h-3.5" />
						Avg Response
					</div>
					<div class="text-2xl font-bold">{formatMs(metrics.lastHour.avgResponseMs)}</div>
					<div class="text-xs text-zinc-500 mt-1">
						{formatMs(metrics.lastHour.minResponseMs)} - {formatMs(metrics.lastHour.maxResponseMs)}
					</div>
				</div>
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
					<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
						<CheckCircle class="w-3.5 h-3.5 text-emerald-500" />
						Success Rate
					</div>
					<div class="text-2xl font-bold">{metrics.lastHour.successRate}</div>
				</div>
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
					<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
						<AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
						Fallback Rate
					</div>
					<div class="text-2xl font-bold">{metrics.lastHour.fallbackRate}</div>
				</div>
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
					<div class="flex items-center gap-2 text-zinc-500 text-xs mb-2">
						<Shield class="w-3.5 h-3.5" />
						Rate Limited
					</div>
					<div class="text-2xl font-bold">{rateLimit.limitedClients}</div>
					<div class="text-xs text-zinc-500 mt-1">{rateLimit.activeClients} active IPs</div>
				</div>
			</div>
		</div>

		<!-- Two Column Layout -->
		<div class="grid md:grid-cols-2 gap-6 mb-6">
			<!-- Model Usage -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-4">
					<Cpu class="w-4 h-4 text-violet-400" />
					<h2 class="text-sm font-semibold text-zinc-300">Model Usage (24h)</h2>
				</div>
				{#if Object.keys(metrics.last24h.byModel).length === 0}
					<p class="text-sm text-zinc-500">No data yet</p>
				{:else}
					{@const totalModelCalls = Object.values(metrics.last24h.byModel as Record<string, number>).reduce((a, b) => a + b, 0)}
					<div class="space-y-3">
						{#each Object.entries(metrics.last24h.byModel as Record<string, number>).sort(([,a], [,b]) => b - a) as [model, count]}
							{@const pct = totalModelCalls > 0 ? (count / totalModelCalls) * 100 : 0}
							<div>
								<div class="flex items-center justify-between text-xs mb-1">
									<span class="text-zinc-300 font-mono">{shortModel(model)}</span>
									<span class="text-zinc-500">{count} ({pct.toFixed(0)}%)</span>
								</div>
								<div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
									<div
										class="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
										style="width: {pct}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if Object.keys(metrics.last24h.byBot).length > 0}
					<div class="mt-5 pt-4 border-t border-zinc-800">
						<h3 class="text-xs font-medium text-zinc-500 mb-3">Per Bot</h3>
						<div class="grid grid-cols-2 gap-3">
							{#each Object.entries(metrics.last24h.byBot) as [bot, stats]}
								<div class="bg-zinc-800/50 rounded-lg p-3">
									<div class="text-xs text-zinc-400 mb-1 capitalize flex items-center gap-1.5">
										<Bot class="w-3 h-3" />
										{bot}
									</div>
									<div class="text-lg font-bold">{(stats as any).count}</div>
									<div class="text-xs text-zinc-500">avg {formatMs((stats as any).avgMs)}</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Daily Activity -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-4">
					<MessageSquare class="w-4 h-4 text-teal-400" />
					<h2 class="text-sm font-semibold text-zinc-300">Daily Chat Volume (14 days)</h2>
				</div>
				{#if sortedDays.length === 0}
					<p class="text-sm text-zinc-500">No log data yet</p>
				{:else}
					<div class="space-y-1.5">
						{#each sortedDays as [day, counts]}
							{@const total = counts.organizer + counts.tix}
							{@const orgPct = maxDayTotal > 0 ? (counts.organizer / maxDayTotal) * 100 : 0}
							{@const tixPct = maxDayTotal > 0 ? (counts.tix / maxDayTotal) * 100 : 0}
							<div class="flex items-center gap-3">
								<span class="text-xs font-mono text-zinc-500 w-20 shrink-0">{day}</span>
								<div class="flex-1 h-4 bg-zinc-800 rounded overflow-hidden flex">
									{#if orgPct > 0}
										<div
											class="h-full bg-gradient-to-r from-teal-600 to-teal-500"
											style="width: {orgPct}%"
										></div>
									{/if}
									{#if tixPct > 0}
										<div
											class="h-full bg-gradient-to-r from-rose-600 to-rose-500"
											style="width: {tixPct}%"
										></div>
									{/if}
								</div>
								<span class="text-xs font-mono text-zinc-500 w-8 text-right">{total}</span>
							</div>
						{/each}
					</div>
					<div class="flex items-center gap-4 mt-3 text-xs text-zinc-500">
						<span class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
							Organizer
						</span>
						<span class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
							Tix
						</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Rate Limit Status -->
		<div class="mb-6">
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-4">
					<Shield class="w-4 h-4 text-amber-400" />
					<h2 class="text-sm font-semibold text-zinc-300">Rate Limit Status</h2>
				</div>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<div class="text-xs text-zinc-500 mb-1">Active Clients</div>
						<div class="text-xl font-bold">{rateLimit.activeClients}</div>
					</div>
					<div>
						<div class="text-xs text-zinc-500 mb-1">Total Requests (window)</div>
						<div class="text-xl font-bold">{rateLimit.totalRequests}</div>
					</div>
					<div>
						<div class="text-xs text-zinc-500 mb-1">Currently Limited</div>
						<div class="text-xl font-bold {rateLimit.limitedClients > 0 ? 'text-red-400' : 'text-emerald-400'}">
							{rateLimit.limitedClients}
						</div>
					</div>
					<div>
						<div class="text-xs text-zinc-500 mb-1">Limit</div>
						<div class="text-xl font-bold">{rateLimit.maxRequestsPerMinute}/min</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Server Logs (Backend) -->
		<div class="mb-6">
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<Terminal class="w-4 h-4 text-orange-400" />
						<h2 class="text-sm font-semibold text-zinc-300">Server Logs</h2>
						{#if serverLogsSummary}
							<div class="flex items-center gap-2 ml-2">
								<span class="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">{serverLogsSummary.lastHour.info} info</span>
								<span class="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{serverLogsSummary.lastHour.warn} warn</span>
								<span class="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{serverLogsSummary.lastHour.error} err</span>
								<span class="text-xs text-zinc-500">last hour</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Filter class="w-3 h-3 text-zinc-500" />
						<select
							bind:value={logLevelFilter}
							class="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 outline-none"
						>
							<option value="all">All levels</option>
							<option value="info">Info</option>
							<option value="warn">Warn</option>
							<option value="error">Error</option>
						</select>
						<select
							bind:value={logSourceFilter}
							class="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 outline-none"
						>
							<option value="all">All sources</option>
							{#each logSources as src}
								<option value={src}>{src}</option>
							{/each}
						</select>
						{#if filteredServerLogs.length > 0}
							<button
								onclick={copyAllFilteredLogs}
								class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-400 transition-colors"
								title="Copy all visible logs"
							>
								<Copy class="w-3 h-3" />
								Copy All
							</button>
						{/if}
					</div>
				</div>

				{#if !serverLogs || serverLogs.length === 0}
					<p class="text-sm text-zinc-500">No server logs yet - they will appear as the bots handle requests</p>
				{:else}
					<div class="max-h-[600px] overflow-y-auto">
						<table class="w-full text-sm">
							<thead class="sticky top-0 bg-zinc-900 z-10">
								<tr class="text-xs text-zinc-500 border-b border-zinc-800">
									<th class="text-left pb-2 font-medium w-6"></th>
									<th class="text-left pb-2 font-medium w-28">Time</th>
									<th class="text-left pb-2 font-medium w-16">Level</th>
									<th class="text-left pb-2 font-medium w-24">Source</th>
									<th class="text-left pb-2 font-medium">Message</th>
									<th class="text-right pb-2 font-medium w-16"></th>
								</tr>
							</thead>
							<tbody>
								{#each filteredServerLogs.slice(0, 100) as entry (entry.id)}
									{@const isExpanded = expandedLogIds.has(entry.id)}
									{@const expandable = hasExpandableContent(entry)}
									<!-- Main row -->
									<tr
										class="border-b border-zinc-800/30 {expandable ? 'cursor-pointer' : ''} {isExpanded ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20'}"
										onclick={() => expandable && toggleLogExpand(entry.id)}
									>
										<td class="py-1.5 pl-1 w-6">
											{#if expandable}
												{#if isExpanded}
													<ChevronDown class="w-3.5 h-3.5 text-zinc-500" />
												{:else}
													<ChevronRight class="w-3.5 h-3.5 text-zinc-500" />
												{/if}
											{/if}
										</td>
										<td class="py-1.5 text-xs text-zinc-500 font-mono whitespace-nowrap">
											{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
										</td>
										<td class="py-1.5">
											<span class="text-xs px-1.5 py-0.5 rounded font-medium {levelBg(entry.level)}">
												{#if entry.level === 'error'}
													<CircleX class="w-3 h-3 inline -mt-0.5 mr-0.5" />
												{:else if entry.level === 'warn'}
													<TriangleAlert class="w-3 h-3 inline -mt-0.5 mr-0.5" />
												{:else}
													<Info class="w-3 h-3 inline -mt-0.5 mr-0.5" />
												{/if}
												{entry.level}
											</span>
										</td>
										<td class="py-1.5">
											<span class="text-xs px-1.5 py-0.5 rounded font-mono {sourceBg(entry.source)}">
												{entry.source}
											</span>
										</td>
										<td class="py-1.5 text-sm text-zinc-300">
											<span class={levelColor(entry.level)}>{entry.message}</span>
											{#if entry.details && !isExpanded}
												<span class="text-xs text-zinc-500 ml-2 truncate inline-block max-w-xs align-bottom">{entry.details}</span>
											{/if}
										</td>
										<td class="py-1.5 text-right pr-1">
											<button
												onclick={(e) => { e.stopPropagation(); copyLogToClipboard(entry); }}
												class="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
												title="Copy full log entry"
											>
												{#if copiedLogId === entry.id}
													<Check class="w-3.5 h-3.5 text-emerald-400" />
												{:else}
													<Copy class="w-3.5 h-3.5" />
												{/if}
											</button>
										</td>
									</tr>
									<!-- Expanded detail row -->
									{#if isExpanded}
										<tr class="bg-zinc-800/30">
											<td colspan="6" class="px-4 py-3">
												<div class="rounded-lg bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs space-y-3">
													<!-- Details -->
													{#if entry.details}
														<div>
															<div class="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Details</div>
															<div class="text-zinc-300 whitespace-pre-wrap break-all">{entry.details}</div>
														</div>
													{/if}
													<!-- Stack trace -->
													{#if entry.stack}
														<div>
															<div class="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Stack Trace</div>
															<pre class="text-red-400/80 whitespace-pre-wrap break-all overflow-x-auto text-[11px] leading-relaxed">{entry.stack}</pre>
														</div>
													{/if}
													<!-- Context -->
													{#if entry.context && Object.keys(entry.context).length > 0}
														<div>
															<div class="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Context</div>
															<pre class="text-sky-400/80 whitespace-pre-wrap break-all overflow-x-auto text-[11px] leading-relaxed">{JSON.stringify(entry.context, null, 2)}</pre>
														</div>
													{/if}
													<!-- Metadata -->
													<div class="flex items-center gap-4 pt-2 border-t border-zinc-800 text-zinc-500">
														<span>ID: #{entry.id}</span>
														<span>Time: {entry.timestamp}</span>
														<span>Source: {entry.source}</span>
														<span>Level: {entry.level}</span>
													</div>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
					<div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
						<span>
							Showing {Math.min(filteredServerLogs.length, 100)} of {filteredServerLogs.length} entries
							{#if logLevelFilter !== 'all' || logSourceFilter !== 'all'}
								(filtered from {serverLogs.length} total)
							{/if}
						</span>
						<span class="text-zinc-600">Click a row to expand full details</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Requests (from metrics) -->
		{#if metrics.recentRequests && metrics.recentRequests.length > 0}
			<div class="mb-6">
				<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
					<div class="flex items-center gap-2 mb-4">
						<Zap class="w-4 h-4 text-indigo-400" />
						<h2 class="text-sm font-semibold text-zinc-300">Recent Requests</h2>
						<span class="text-xs text-zinc-500">last {metrics.recentRequests.length}</span>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="text-xs text-zinc-500 border-b border-zinc-800">
									<th class="text-left pb-2 font-medium">Time</th>
									<th class="text-left pb-2 font-medium">Bot</th>
									<th class="text-left pb-2 font-medium">Model</th>
									<th class="text-right pb-2 font-medium">Response</th>
									<th class="text-center pb-2 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each metrics.recentRequests.slice(0, 20) as req}
									<tr class="border-b border-zinc-800/50 last:border-0">
										<td class="py-2 text-xs text-zinc-400 font-mono">
											{new Date(req.timestamp).toLocaleTimeString()}
										</td>
										<td class="py-2">
											<span class="text-xs px-2 py-0.5 rounded-full font-medium
												{req.bot === 'organizer' ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}"
											>
												{req.bot}
											</span>
										</td>
										<td class="py-2 text-xs text-zinc-300 font-mono">
											{shortModel(req.model)}
											{#if req.fallbackIndex > 0}
												<span class="text-amber-400 ml-1">(fb#{req.fallbackIndex})</span>
											{/if}
										</td>
										<td class="py-2 text-right text-xs font-mono
											{req.responseTimeMs < 2000 ? 'text-emerald-400' : req.responseTimeMs < 5000 ? 'text-amber-400' : 'text-red-400'}"
										>
											{formatMs(req.responseTimeMs)}
										</td>
										<td class="py-2 text-center">
											{#if req.success}
												<CheckCircle class="w-3.5 h-3.5 text-emerald-400 mx-auto" />
											{:else}
												<XCircle class="w-3.5 h-3.5 text-red-400 mx-auto" />
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Chat Logs -->
		<div class="mb-6">
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-4">
					<MessageSquare class="w-4 h-4 text-teal-400" />
					<h2 class="text-sm font-semibold text-zinc-300">Recent Chat Logs</h2>
					<span class="text-xs text-zinc-500">{logStats.totalEntries} total across {logStats.logFiles} files</span>
				</div>
				{#if logs.length === 0}
					<p class="text-sm text-zinc-500">No chat logs yet</p>
				{:else}
					<div class="overflow-x-auto max-h-[400px] overflow-y-auto">
						<table class="w-full text-sm">
							<thead class="sticky top-0 bg-zinc-900 z-10">
								<tr class="text-xs text-zinc-500 border-b border-zinc-800">
									<th class="text-left pb-2 font-medium">Time</th>
									<th class="text-left pb-2 font-medium">Bot</th>
									<th class="text-left pb-2 font-medium">Query</th>
									<th class="text-left pb-2 font-medium">IP Hash</th>
								</tr>
							</thead>
							<tbody>
								{#each logs.slice(0, 50) as log}
									<tr class="border-b border-zinc-800/50 last:border-0">
										<td class="py-2 text-xs text-zinc-400 font-mono whitespace-nowrap">
											{new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
										</td>
										<td class="py-2">
											<span class="text-xs px-2 py-0.5 rounded-full font-medium
												{log.bot === 'organizer' ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}"
											>
												{log.bot}
											</span>
										</td>
										<td class="py-2 text-sm text-zinc-300 max-w-md truncate">
											{log.query}
										</td>
										<td class="py-2 text-xs text-zinc-500 font-mono">
											{log.ipHash}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="text-center text-xs text-zinc-600 pb-8">
			Admin Dashboard · Veent Bot Monitoring · Server time: {admin.serverTime ? new Date(admin.serverTime).toLocaleString() : 'N/A'}
		</div>
	</div>
</div>
