<script lang="ts">
	import '../../app.css';
	import FloatingAiAssistant from '$lib/components/ui/FloatingAiAssistant.svelte';
</script>

<svelte:head>
	<title>Veent Tix Support</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
	<!-- Nav -->
	<nav class="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-zinc-800/50 gap-4">
		<div class="flex items-center gap-2 shrink-0">
			<div class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">VEENT</div>
			<div class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded hidden sm:block">TIX SUPPORT</div>
		</div>
		<div class="flex items-center gap-3 sm:gap-6 text-sm text-zinc-400 overflow-x-auto">
			<a href="/" class="px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-700 text-white text-xs font-medium rounded-lg hover:bg-teal-600 transition-colors shrink-0">Organizer Bot</a>
			<a href="https://dashboard.veent.io" target="_blank" class="hover:text-white transition-colors hidden sm:block shrink-0">Open Dashboard</a>
			<a href="https://veent.io/contacts" target="_blank" class="hover:text-white transition-colors shrink-0">Support</a>
			<a href="https://dashboard.veent.io" target="_blank" class="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-700 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors shrink-0">SIGN IN</a>
		</div>
	</nav>

	<div class="max-w-4xl mx-auto px-8 py-20">
		<h1 class="text-5xl font-bold leading-tight mb-6">
			Ticket Support<br />Made Simple.
		</h1>
		<p class="text-lg text-zinc-400 max-w-lg mb-10 leading-relaxed">
			Get instant help with ticket purchases, order issues, refunds,
			and everything about your event tickets. Your AI assistant for ticket support.
		</p>
		<div class="flex items-center gap-4">
			<a href="https://dashboard.veent.io" target="_blank" class="px-6 py-3 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
				Open Dashboard
			</a>
			<a href="https://veent.io/contacts" target="_blank" class="px-6 py-3 text-zinc-300 text-sm font-medium hover:text-white transition-colors">
				Contact Support →
			</a>
		</div>

		<!-- Feature cards -->
		<div class="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each [
				{ name: 'Ticket Purchases', desc: 'Help with buying tickets, payment methods, and confirmations', icon: '🎫' },
				{ name: 'Order Issues', desc: 'Track orders, resolve errors, and manage your bookings', icon: '📋' },
				{ name: 'Refunds & Transfers', desc: 'Request refunds, transfer tickets, and cancellation help', icon: '💳' },
			] as feature}
				<div class="rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 hover:border-red-700/50 transition-colors">
					<div class="w-full h-32 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 mb-3 flex items-center justify-center">
						<span class="text-3xl">{feature.icon}</span>
					</div>
					<h3 class="text-sm font-semibold text-zinc-200">{feature.name}</h3>
					<p class="text-xs text-zinc-500 mt-1">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</div>

<FloatingAiAssistant
	botName="Tix"
	botSubtitle="Ticket Support"
	chatEndpoint="/api/tix-chat"
	feedbackEndpoint="/api/tix-feedback"
	storagePrefix="tix"
	placeholder="Ask about tickets..."
	welcomeMessage="Hey! I'm Tix"
	welcomeDescription="Your ticket support buddy. I can help with purchases, orders, refunds, and anything ticket-related."
	quickPrompts={[
		{ label: 'Buy tickets', message: 'How do I buy tickets?' },
		{ label: 'Track my order', message: 'How can I track my ticket order?' },
		{ label: 'Request refund', message: 'How do I request a refund?' }
	]}
/>
