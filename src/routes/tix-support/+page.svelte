<svelte:head>
	<title>Veent Tix Support</title>
	{@html `<script>window.difyChatbotConfig = { token: 'wHjfix4x8U53nv9u' };</script>`}
	{@html `<script src="https://udify.app/embed.min.js" id="wHjfix4x8U53nv9u" defer></script>`}
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center">
	<div class="text-center">
		<div class="flex items-center justify-center gap-2 mb-4">
			<div class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">VEENT</div>
			<div class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">TIX SUPPORT</div>
		</div>
		<p class="text-sm text-zinc-500">Click the chat button to get started</p>
	</div>
</div>

<style>
	:global(#dify-chatbot-bubble-button) {
		position: fixed !important;
		z-index: 2147483647 !important;
		background: linear-gradient(135deg, #ef4444, #dc2626) !important;
		width: 60px !important;
		height: 60px !important;
		right: 28px !important;
		bottom: 28px !important;
		border-radius: 50% !important;
		border: none !important;
		cursor: pointer !important;
		box-shadow: 0 4px 14px rgba(220,38,38,0.45), 0 0 0 0 rgba(220,38,38,0.3) !important;
		transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease !important;
		animation: bubbleEntrance 0.6s cubic-bezier(0.34,1.56,0.64,1) both, bubblePulse 3s ease-in-out 2s infinite !important;
	}
	:global(#dify-chatbot-bubble-button:hover) {
		transform: scale(1.1) !important;
		box-shadow: 0 6px 20px rgba(220,38,38,0.5), 0 0 0 0 rgba(220,38,38,0) !important;
	}
	:global(#dify-chatbot-bubble-button:active) { transform: scale(0.95) !important; }
	:global(#dify-chatbot-bubble-button svg) {
		width: 28px !important;
		height: 28px !important;
		transition: transform 0.3s ease !important;
	}
	:global(#dify-chatbot-bubble-button:hover svg) { transform: rotate(15deg) !important; }
	:global(#dify-chatbot-bubble-window) {
		position: fixed !important;
		z-index: 2147483646 !important;
		width: 24rem !important;
		height: 42rem !important;
		max-height: calc(100vh - 120px) !important;
		right: 28px !important;
		bottom: 100px !important;
		border-radius: 16px !important;
		border: 1px solid rgba(255,255,255,0.08) !important;
		box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 10px 20px rgba(0,0,0,0.3) !important;
		animation: windowSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both !important;
		overflow: hidden !important;
	}
	:global(#dify-chatbot-bubble-window iframe) { border: none !important; border-radius: 16px !important; }
	@keyframes bubbleEntrance {
		0% { transform: scale(0) rotate(-45deg); opacity: 0; }
		60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
		100% { transform: scale(1) rotate(0deg); opacity: 1; }
	}
	@keyframes bubblePulse {
		0%, 100% { box-shadow: 0 4px 14px rgba(220,38,38,0.45), 0 0 0 0 rgba(220,38,38,0.3); }
		50% { box-shadow: 0 4px 14px rgba(220,38,38,0.45), 0 0 0 10px rgba(220,38,38,0); }
	}
	@keyframes windowSlideUp {
		0% { transform: translateY(20px) scale(0.96); opacity: 0; }
		100% { transform: translateY(0) scale(1); opacity: 1; }
	}
</style>
