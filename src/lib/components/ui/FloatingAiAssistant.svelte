<script lang="ts">
	import { Send, Bot, X, Sparkles, RotateCcw, RotateCw, ThumbsUp, ThumbsDown, Copy, Check, ChevronDown, User, Mic, MicOff } from 'lucide-svelte';
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	marked.setOptions({ breaks: true, gfm: true });

	interface Props {
		botName?: string;
		botSubtitle?: string;
		chatEndpoint?: string;
		feedbackEndpoint?: string;
		storagePrefix?: string;
		placeholder?: string;
		welcomeMessage?: string;
		welcomeDescription?: string;
		quickPrompts?: { label: string; message: string }[];
	}

	let {
		botName = 'Vee',
		botSubtitle = 'Dashboard Assistant',
		chatEndpoint = '/api/chat',
		feedbackEndpoint = '/api/feedback',
		storagePrefix = 'vee',
		placeholder = 'Ask Vee anything...',
		welcomeMessage = "Hey! I'm Vee",
		welcomeDescription = 'Your dashboard buddy. Think of me as that coworker who knows every button and menu.',
		quickPrompts = [
			{ label: "I'm new here", message: "I'm new here, where do I start?" },
			{ label: 'Tickets & pricing', message: 'How do I set up tickets and pricing?' },
			{ label: 'Event day check-in', message: 'How do I scan tickets on event day?' }
		]
	}: Props = $props();

	function renderMarkdown(text: string): string {
		if (!text) return '';
		return marked.parse(text, { async: false }) as string;
	}

	interface ChatMessage {
		role: string;
		content: string;
		id: number;
		difyMessageId?: string;
		feedback?: 'like' | 'dislike' | null;
		timestamp: number;
		error?: boolean;
	}

	let isChatOpen = $state(false);
	let message = $state('');
	let charCount = $derived(message.length);
	const maxChars = 2000;
	let messages = $state<ChatMessage[]>([]);
	let msgIdCounter = 0;
	let loading = $state(false);
	let conversationId = $state('');
	let chatContainer: HTMLDivElement | undefined = $state();
	let chatRef: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let showWelcome = $state(true);
	let showScrollBtn = $state(false);
	let copiedMsgId = $state<number | null>(null);
	let mounted = false;

	// Drag state
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartY = 0;
	let btnX = $state(0);
	let btnY = $state(0);
	let startBtnX = 0;
	let startBtnY = 0;
	let hasMoved = false;

	let charColor = $derived(
		charCount > maxChars * 0.9
			? 'text-red-400'
			: charCount > maxChars * 0.7
				? 'text-amber-400'
				: 'text-neutral-500'
	);

	// 5. Persist messages in localStorage
	onMount(() => {
		mounted = true;
		try {
			const saved = localStorage.getItem(`${storagePrefix}-messages`);
			const savedConvId = localStorage.getItem(`${storagePrefix}-conversation-id`);
			if (saved) {
				const parsed = JSON.parse(saved);
				messages = parsed
					.filter((m: ChatMessage) => !m.error)
					.map((m: ChatMessage) => ({ ...m, timestamp: m.timestamp || Date.now() }));
				msgIdCounter = messages.length > 0 ? Math.max(...messages.map((m: ChatMessage) => m.id)) : 0;
				showWelcome = messages.length === 0;
			}
			if (savedConvId) conversationId = savedConvId;
		} catch {}
	});

	$effect(() => {
		if (!mounted) return;
		const serialized = JSON.stringify(messages);
		const convId = conversationId;
		const timeout = setTimeout(() => {
			if (messages.length > 0) {
				localStorage.setItem(`${storagePrefix}-messages`, serialized);
				if (convId) localStorage.setItem(`${storagePrefix}-conversation-id`, convId);
			} else {
				localStorage.removeItem(`${storagePrefix}-messages`);
				localStorage.removeItem(`${storagePrefix}-conversation-id`);
			}
		}, 500);
		return () => clearTimeout(timeout);
	});

	// 3. Timestamps
	function formatTime(ts: number): string {
		const diff = Math.floor((Date.now() - ts) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// 1. Auto-resize textarea
	function autoResize() {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';
		}
	}

	// 2. Scroll tracking for scroll-to-bottom button
	function onScroll() {
		if (chatContainer) {
			const { scrollTop, scrollHeight, clientHeight } = chatContainer;
			showScrollBtn = scrollHeight - scrollTop - clientHeight > 100;
		}
	}

	function scrollToBottom() {
		if (chatContainer) {
			setTimeout(() => {
				if (chatContainer) {
					chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
				}
			}, 50);
		}
	}

	// 4. Copy message (with fallback for HTTP)
	async function copyMessage(msg: ChatMessage) {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(msg.content);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = msg.content;
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
			copiedMsgId = msg.id;
			setTimeout(() => { copiedMsgId = null; }, 2000);
		} catch {}
	}

	// Speech-to-text
	let isListening = $state(false);
	let speechSupported = $state(false);
	let recognition: any = null;

	onMount(() => {
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (SpeechRecognition) {
			speechSupported = true;
			recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.interimResults = true;
			recognition.lang = 'en-US';

			recognition.onresult = (event: any) => {
				let transcript = '';
				for (let i = 0; i < event.results.length; i++) {
					transcript += event.results[i][0].transcript;
				}
				message = transcript;
				autoResize();
			};

			recognition.onend = () => {
				isListening = false;
			};

			recognition.onerror = () => {
				isListening = false;
			};
		}
	});

	function toggleMic() {
		if (!recognition) return;
		if (isListening) {
			recognition.stop();
			isListening = false;
		} else {
			recognition.start();
			isListening = true;
		}
	}

	// Drag handlers
	function clampPosition(x: number, y: number) {
		const btnSize = 64;
		const maxX = window.innerWidth - btnSize;
		const maxY = window.innerHeight - btnSize;
		return {
			x: Math.max(0, Math.min(x, maxX)),
			y: Math.max(0, Math.min(y, maxY))
		};
	}

	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		hasMoved = false;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		startBtnX = btnX;
		startBtnY = btnY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dx = e.clientX - dragStartX;
		const dy = e.clientY - dragStartY;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			hasMoved = true;
			if (isChatOpen) isChatOpen = false;
		}
		const clamped = clampPosition(startBtnX + dx, startBtnY + dy);
		btnX = clamped.x;
		btnY = clamped.y;
	}

	function onPointerUp() {
		isDragging = false;
		if (!hasMoved) {
			isChatOpen = !isChatOpen;
		}
	}

	let chatStyle = $derived.by(() => {
		const btnSize = 64;
		const chatW = 420;
		const gap = 12;

		let left: number;
		if (btnX + btnSize > chatW) {
			left = btnX + btnSize - chatW;
		} else {
			left = btnX;
		}
		left = Math.max(8, Math.min(left, window.innerWidth - chatW - 8));

		const spaceAbove = btnY - gap;
		const spaceBelow = window.innerHeight - btnY - btnSize - gap;

		if (spaceAbove >= 300) {
			const bottom = window.innerHeight - btnY + gap;
			const maxH = Math.max(spaceAbove - 8, 300);
			return `left:${left}px;bottom:${bottom}px;max-height:${maxH}px;`;
		} else {
			const top = btnY + btnSize + gap;
			const maxH = Math.max(spaceBelow - 8, 300);
			return `left:${left}px;top:${top}px;max-height:${maxH}px;`;
		}
	});

	$effect(() => {
		btnX = window.innerWidth - 64 - 24;
		btnY = window.innerHeight - 64 - 40;
	});

	$effect(() => {
		if (isChatOpen && textareaEl) {
			setTimeout(() => textareaEl?.focus(), 350);
		}
	});

	// Streaming helper (shared by handleSend and retry)
	async function streamResponse(userMessage: string) {
		messages.push({ role: 'assistant', content: '', id: ++msgIdCounter, timestamp: Date.now() });
		const assistantIdx = messages.length - 1;

		try {
			// Build conversation history for context
			const history = messages
				.filter(m => m.content && !m.error)
				.slice(0, -1) // exclude the empty assistant message we just added
				.map(m => ({ role: m.role, content: m.content }));

			const res = await fetch(chatEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMessage, conversation_id: conversationId, history })
			});

			if (!res.ok) {
				messages[assistantIdx].content = 'Sorry, I encountered an error. Please try again.';
				messages[assistantIdx].error = true;
				loading = false;
				return;
			}

			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const data = line.slice(6).trim();
					if (!data) continue;

					try {
						const parsed = JSON.parse(data);

						if (parsed.event === 'agent_message' || parsed.event === 'message') {
							messages[assistantIdx].content += parsed.answer || '';
							if (parsed.message_id) {
								messages[assistantIdx].difyMessageId = parsed.message_id;
							}
							scrollToBottom();
						}

						if (parsed.event === 'message_end') {
							if (parsed.conversation_id) {
								conversationId = parsed.conversation_id;
							}
							if (parsed.message_id) {
								messages[assistantIdx].difyMessageId = parsed.message_id;
							}
						}
					} catch {
						// skip non-JSON lines
					}
				}
			}
		} catch {
			messages[assistantIdx].content = 'Could not connect to the server. Please try again.';
			messages[assistantIdx].error = true;
		}

		loading = false;
		scrollToBottom();
	}

	async function handleSend() {
		const text = message.trim();
		if (!text || loading || charCount > maxChars) return;

		showWelcome = false;
		messages.push({ role: 'user', content: text, id: ++msgIdCounter, timestamp: Date.now() });
		message = '';
		if (textareaEl) textareaEl.style.height = 'auto';
		loading = true;
		scrollToBottom();

		await streamResponse(text);
	}

	// 7. Retry on error
	async function retryLastMessage() {
		if (loading) return;
		let lastUserContent = '';
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === 'user') {
				lastUserContent = messages[i].content;
				break;
			}
		}
		if (!lastUserContent) return;

		messages = messages.filter(m => !m.error);
		loading = true;
		scrollToBottom();
		await streamResponse(lastUserContent);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function clearChat() {
		messages = [];
		conversationId = '';
		showWelcome = true;
		localStorage.removeItem(`${storagePrefix}-messages`);
		localStorage.removeItem(`${storagePrefix}-conversation-id`);
	}

	async function sendFeedback(msgIdx: number, rating: 'like' | 'dislike') {
		const msg = messages[msgIdx];
		if (!msg?.difyMessageId || msg.feedback) return;

		messages[msgIdx].feedback = rating;

		try {
			const res = await fetch(feedbackEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message_id: msg.difyMessageId,
					rating
				})
			});

			if (!res.ok) {
				messages[msgIdx].feedback = null;
			}
		} catch {
			messages[msgIdx].feedback = null;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (chatRef && !chatRef.contains(target) && !target.closest('.floating-ai-button')) {
			if (target.closest('a[href]')) {
				isChatOpen = false;
				return;
			}
			event.preventDefault();
			isChatOpen = false;
		}
	}

	$effect(() => {
		if (isChatOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	});
</script>

<div class="font-sans">
	<!-- Draggable Floating Button -->
	<button
		class="floating-ai-button fixed z-[60] w-16 h-16 rounded-full flex items-center justify-center"
		class:cursor-grabbing={isDragging}
		class:cursor-grab={!isDragging}
		class:btn-dragging={isDragging}
		class:btn-open={isChatOpen}
		style="left:{btnX}px;top:{btnY}px;touch-action:none;"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
	>
		<div class="btn-glow-ring"></div>
		<div class="btn-inner">
			<div class="relative z-10 icon-flip" class:icon-flipped={isChatOpen}>
				{#if isChatOpen}
					<X class="w-7 h-7 text-white drop-shadow-lg" />
				{:else}
					<Bot class="w-7 h-7 text-white drop-shadow-lg" />
				{/if}
			</div>
		</div>
		{#if !isChatOpen && !isDragging}
			<div class="btn-ping"></div>
		{/if}
	</button>

	<!-- Chat Interface -->
	{#if isChatOpen}
		<div
			bind:this={chatRef}
			class="chat-container fixed z-50 w-[420px] max-w-[calc(100vw-1rem)] flex flex-col overflow-hidden"
			style={chatStyle}
		>
			<div class="chat-border-glow flex flex-col min-h-0 h-full">
				<div
					class="chat-panel relative flex flex-col rounded-2xl overflow-hidden min-h-0 h-full"
				>
					<!-- Header -->
					<div class="chat-header flex items-center justify-between px-4 py-3 shrink-0">
						<div class="flex items-center gap-2.5">
							<div class="relative">
								<div class="vee-avatar w-9 h-9 rounded-full flex items-center justify-center">
									<Sparkles class="w-4 h-4 text-white" />
								</div>
								<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 status-dot"></div>
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-semibold" style="color:#F4F5F0">{botName}</span>
									<span class="tag-badge tag-live">Live</span>
									<span class="tag-badge tag-beta">Beta</span>
								</div>
								<span class="text-[10px] block" style="color:#858582">{botSubtitle}</span>
							</div>
						</div>
						<div class="flex items-center gap-1">
							{#if messages.length > 0}
								<button
									onclick={clearChat}
									class="p-1.5 rounded-lg transition-all duration-200 group hover-surface"
									title="Clear chat"
								>
									<RotateCcw class="w-3.5 h-3.5 transition-colors duration-500 group-hover:rotate-[-180deg]" style="color:#858582" />
								</button>
							{/if}
							<button
								onclick={() => (isChatOpen = false)}
								class="p-1.5 rounded-lg transition-all duration-200 group hover-surface"
							>
								<X class="w-4 h-4 transition-colors" style="color:#858582" />
							</button>
						</div>
					</div>

					<!-- Messages Area -->
					<div
						bind:this={chatContainer}
						class="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin min-h-0"
						onscroll={onScroll}
					>
						<!-- Welcome State -->
						{#if showWelcome && messages.length === 0}
							<div class="welcome-container flex flex-col items-center justify-center py-6 text-center">
								<div class="welcome-avatar">
									<div class="w-14 h-14 rounded-2xl vee-avatar-welcome flex items-center justify-center backdrop-blur-sm">
										<Bot class="w-7 h-7" style="color:#F4F5F0" />
									</div>
								</div>
								<div class="welcome-text mt-4">
									<p class="text-sm font-medium" style="color:#F4F5F0">{welcomeMessage}</p>
									<p class="text-xs mt-1 max-w-[280px] leading-relaxed" style="color:#858582">{welcomeDescription}</p>
								</div>
								<div class="welcome-prompts flex flex-wrap gap-2 mt-5 justify-center">
									{#each quickPrompts as prompt}
										<button
											class="prompt-chip"
											onclick={() => { message = prompt.message; handleSend(); }}
										>
											<span class="prompt-chip-dot"></span>
											{prompt.label}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Messages -->
						{#each messages as msg, i (msg.id)}
							{#if msg.role === 'user'}
								<!-- 11. User avatar -->
								<div class="msg-row msg-user flex justify-end gap-2" style="animation-delay:{i * 30}ms">
									<div class="flex flex-col items-end gap-0.5">
										<div class="msg-bubble-user max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed" style="color:#F4F5F0">
											{msg.content}
										</div>
										<!-- 3. Timestamp -->
										<span class="msg-timestamp">{formatTime(msg.timestamp)}</span>
									</div>
									<div class="shrink-0 mt-0.5">
										<div class="w-6 h-6 rounded-lg user-icon-small flex items-center justify-center">
											<User class="w-3 h-3" style="color:#858582" />
										</div>
									</div>
								</div>
							{:else}
								<div class="msg-row msg-assistant flex items-start gap-2.5" style="animation-delay:{i * 30}ms">
									<div class="shrink-0 mt-0.5">
										<div class="w-6 h-6 rounded-lg vee-icon-small flex items-center justify-center">
											<Sparkles class="w-3 h-3" style="color:#E21D48" />
										</div>
									</div>
									<div class="flex flex-col max-w-[82%]">
										<div class="msg-bubble-assistant px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed" style="color:#F4F5F0">
											<!-- 9. Skeleton loading -->
											{#if !msg.content && loading && i === messages.length - 1}
												<div class="skeleton-loader">
													<div class="skeleton-line" style="width:75%"></div>
													<div class="skeleton-line" style="width:50%"></div>
													<div class="skeleton-line" style="width:60%"></div>
												</div>
											{:else if msg.error}
												<!-- 7. Error with retry button -->
												<div class="flex flex-col gap-2">
													<span>{msg.content}</span>
													<button onclick={retryLastMessage} class="retry-btn">
														<RotateCw class="w-3 h-3" />
														<span>Retry</span>
													</button>
												</div>
											{:else}
												<div class="prose-chat">
													{@html renderMarkdown(msg.content)}
												</div>
											{/if}
										</div>
										<!-- 4. Copy button + feedback -->
										{#if msg.content && !msg.error}
											<div class="action-row flex items-center gap-1 mt-1 ml-1">
												<button
													class="feedback-btn"
													onclick={() => copyMessage(msg)}
													title={copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
													aria-label="Copy message"
												>
													{#if copiedMsgId === msg.id}
														<Check class="w-3 h-3" style="color:#4ade80" />
													{:else}
														<Copy class="w-3 h-3" />
													{/if}
												</button>
												{#if msg.difyMessageId}
													<button
														class="feedback-btn"
														class:feedback-active={msg.feedback === 'like'}
														class:feedback-given={msg.feedback != null}
														disabled={msg.feedback != null}
														onclick={() => sendFeedback(i, 'like')}
														title="Helpful"
														aria-label="Mark as helpful"
													>
														<ThumbsUp class="w-3 h-3" />
													</button>
													<button
														class="feedback-btn"
														class:feedback-active={msg.feedback === 'dislike'}
														class:feedback-given={msg.feedback != null}
														disabled={msg.feedback != null}
														onclick={() => sendFeedback(i, 'dislike')}
														title="Not helpful"
														aria-label="Mark as not helpful"
													>
														<ThumbsDown class="w-3 h-3" />
													</button>
												{/if}
											</div>
										{/if}
										<!-- 3. Timestamp -->
										{#if msg.content}
											<span class="msg-timestamp ml-1">{formatTime(msg.timestamp)}</span>
										{/if}
									</div>
								</div>
							{/if}
						{/each}

					</div>

					<!-- 2. Scroll to bottom button -->
					{#if showScrollBtn}
						<button class="scroll-bottom-btn" onclick={scrollToBottom}>
							<ChevronDown class="w-4 h-4" />
						</button>
					{/if}

					<!-- Input Section -->
					<div class="input-section shrink-0">
						<div class="relative px-4 pt-3 pb-2">
							<div class="input-wrapper rounded-xl"
								class:input-focused={message.length > 0}
							>
								<!-- 1. Auto-resize textarea -->
								<textarea
									bind:this={textareaEl}
									bind:value={message}
									onkeydown={handleKeyDown}
									oninput={autoResize}
									rows={1}
									disabled={loading}
									class="w-full px-4 py-2.5 bg-transparent border-none outline-none resize-none text-sm font-normal leading-relaxed disabled:opacity-50"
									placeholder={placeholder}
									style="scrollbar-width:none;max-height:120px;color:#F4F5F0;"
								></textarea>
								<div class="flex items-center justify-between px-3 pb-2">
									<div class="flex items-center gap-2">
										<span class="text-[10px] font-medium {charColor} transition-colors duration-300">
											{charCount}/{maxChars}
										</span>
									</div>
									<div class="flex items-center gap-1.5">
									{#if speechSupported}
										<button
											onclick={toggleMic}
											disabled={loading}
											class="mic-btn"
											class:mic-active={isListening}
											title={isListening ? 'Stop listening' : 'Voice input'}
										>
											{#if isListening}
												<MicOff class="w-4 h-4" />
											{:else}
												<Mic class="w-4 h-4" />
											{/if}
										</button>
									{/if}
									<button
										onclick={handleSend}
										disabled={loading || !message.trim() || charCount > maxChars}
										class="send-btn group"
									>
										<Send class="w-4 h-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
									</button>
								</div>
								</div>
							</div>
						</div>

						<!-- Footer -->
						<div class="flex items-center justify-between px-5 pb-3 pt-1 text-[10px]" style="color:#52524F">
							<div class="flex items-center gap-1.5">
								<kbd class="kbd-key">Enter</kbd>
								<span>send</span>
								<span style="color:#363636" class="mx-0.5">|</span>
								<kbd class="kbd-key">Shift+Enter</kbd>
								<span>new line</span>
							</div>
							<div class="flex items-center gap-1">
								<div class="w-1.5 h-1.5 bg-green-500 rounded-full status-pulse"></div>
								<span>Online</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ===== VEENT BRAND COLORS =====
	 * Dark BG:    #111111, #171717, #252323
	 * Surface:    #252323, #474747
	 * Cream text: #F4F5F0
	 * Muted text: #858582
	 * Red accent: #E21D48 / #D90C2A
	 * Border:     #363636
	 */

	/* ===== FLOATING BUTTON — Veent Red ===== */
	.floating-ai-button {
		background: linear-gradient(135deg, #E21D48 0%, #D90C2A 50%, #B80A23 100%);
		border: 1.5px solid rgba(255,255,255,0.12);
		box-shadow:
			0 0 20px rgba(226,29,72,0.4),
			0 0 40px rgba(217,12,42,0.2),
			inset 0 1px 0 rgba(255,255,255,0.15);
		transition: box-shadow 0.3s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.floating-ai-button:hover:not(.btn-dragging) {
		box-shadow:
			0 0 25px rgba(226,29,72,0.6),
			0 0 50px rgba(217,12,42,0.4),
			0 0 80px rgba(184,10,35,0.2),
			inset 0 1px 0 rgba(255,255,255,0.2);
		transform: scale(1.08) !important;
	}
	.floating-ai-button:active:not(.btn-dragging) {
		transform: scale(0.95) !important;
	}
	.btn-dragging {
		box-shadow:
			0 0 30px rgba(226,29,72,0.7),
			0 0 60px rgba(217,12,42,0.4) !important;
		transform: scale(1.12) !important;
	}
	.btn-inner {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-glow-ring {
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		background: conic-gradient(from 0deg, #E21D48, #D90C2A, #B80A23, #E21D48);
		opacity: 0.25;
		animation: glow-spin 4s linear infinite;
		filter: blur(6px);
	}
	.btn-open .btn-glow-ring { opacity: 0.4; }

	@keyframes glow-spin {
		to { transform: rotate(360deg); }
	}

	.icon-flip {
		transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.icon-flipped { transform: rotate(180deg); }

	.btn-ping {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: rgba(226,29,72,0.35);
		animation: soft-ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	@keyframes soft-ping {
		0% { transform: scale(1); opacity: 0.35; }
		75%, 100% { transform: scale(1.6); opacity: 0; }
	}

	/* ===== CHAT CONTAINER ===== */
	.chat-container {
		animation: chat-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
	@keyframes chat-enter {
		0% { opacity: 0; transform: scale(0.9) translateY(12px); filter: blur(4px); }
		100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
	}

	.chat-border-glow {
		position: relative;
		border-radius: 1rem;
		padding: 1px;
		background: linear-gradient(135deg, rgba(226,29,72,0.2), rgba(54,54,54,0.4), rgba(226,29,72,0.15));
	}

	.chat-panel {
		background: linear-gradient(180deg, #171717 0%, #111111 100%);
		backdrop-filter: blur(40px) saturate(1.5);
		border-radius: calc(1rem - 1px);
	}

	/* 6. Mobile full-screen */
	@media (max-width: 639px) {
		.chat-container {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
			width: 100% !important;
			max-width: 100% !important;
			height: 100% !important;
			max-height: 100% !important;
			z-index: 70;
			animation: none;
		}
		.chat-border-glow {
			border-radius: 0;
			height: 100%;
		}
		.chat-panel {
			border-radius: 0;
			height: 100%;
		}
	}

	/* ===== HEADER ===== */
	.chat-header {
		background: linear-gradient(180deg, rgba(37,35,35,0.5) 0%, transparent 100%);
		border-bottom: 1px solid rgba(54,54,54,0.5);
	}

	.vee-avatar {
		background: linear-gradient(135deg, #E21D48, #D90C2A);
		box-shadow: 0 2px 10px rgba(226,29,72,0.3);
	}

	.status-dot {
		background: #4ade80;
		border-color: #171717;
	}

	.hover-surface:hover {
		background: rgba(71,71,71,0.4);
	}

	.tag-badge {
		padding: 2px 8px;
		font-size: 10px;
		font-weight: 600;
		border-radius: 6px;
		letter-spacing: 0.02em;
	}
	.tag-live {
		background: rgba(34,197,94,0.08);
		color: #86efac;
		border: 1px solid rgba(34,197,94,0.12);
	}
	.tag-beta {
		background: rgba(251,191,36,0.08);
		color: #fcd34d;
		border: 1px solid rgba(251,191,36,0.15);
	}

	.status-pulse {
		animation: status-glow 2s ease-in-out infinite;
	}
	@keyframes status-glow {
		0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
		50% { box-shadow: 0 0 0 4px rgba(74,222,128,0); }
	}

	/* ===== WELCOME ===== */
	.welcome-container { animation: welcome-fade 0.5s ease-out 0.2s both; }
	.welcome-avatar { animation: welcome-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
	.welcome-text { animation: welcome-fade 0.5s ease-out 0.5s both; }
	.welcome-prompts { animation: welcome-fade 0.5s ease-out 0.7s both; }

	@keyframes welcome-fade {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes welcome-bounce {
		from { opacity: 0; transform: scale(0.5) translateY(10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.vee-avatar-welcome {
		background: rgba(226,29,72,0.1);
		border: 1px solid rgba(226,29,72,0.15);
	}

	.prompt-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		font-size: 12px;
		color: #858582;
		background: rgba(37,35,35,0.6);
		border: 1px solid rgba(54,54,54,0.5);
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.prompt-chip:hover {
		background: rgba(226,29,72,0.08);
		border-color: rgba(226,29,72,0.25);
		color: #F4F5F0;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(226,29,72,0.12);
	}
	.prompt-chip:active { transform: scale(0.97) translateY(0); }
	.prompt-chip-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #E21D48;
		opacity: 0.5;
	}
	.prompt-chip:hover .prompt-chip-dot { opacity: 1; }

	/* ===== MESSAGES ===== */
	.msg-row { animation: msg-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
	.msg-user { animation-name: msg-slide-right; }
	.msg-assistant { animation-name: msg-slide-left; }

	@keyframes msg-slide-right {
		from { opacity: 0; transform: translateX(16px) scale(0.97); }
		to { opacity: 1; transform: translateX(0) scale(1); }
	}
	@keyframes msg-slide-left {
		from { opacity: 0; transform: translateX(-16px) scale(0.97); }
		to { opacity: 1; transform: translateX(0) scale(1); }
	}

	.msg-bubble-user {
		background: linear-gradient(135deg, #D90C2A 0%, #B80A23 100%);
		box-shadow: 0 2px 12px rgba(217,12,42,0.25);
		transition: box-shadow 0.2s;
	}
	.msg-bubble-user:hover {
		box-shadow: 0 4px 20px rgba(217,12,42,0.35);
	}

	/* 11. User avatar */
	.user-icon-small {
		background: rgba(133,133,130,0.1);
		border: 1px solid rgba(133,133,130,0.15);
	}

	.vee-icon-small {
		background: rgba(226,29,72,0.1);
		border: 1px solid rgba(226,29,72,0.12);
	}

	.msg-bubble-assistant {
		background: rgba(37,35,35,0.6);
		border: 1px solid rgba(54,54,54,0.4);
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.msg-bubble-assistant:hover {
		border-color: rgba(71,71,71,0.5);
		box-shadow: 0 2px 12px rgba(0,0,0,0.3);
	}

	/* 3. Timestamps */
	.msg-timestamp {
		font-size: 10px;
		color: #52524F;
		margin-top: 2px;
	}

	/* ===== ACTION ROW (copy + feedback) ===== */
	.action-row {
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	.msg-row:hover .action-row,
	.action-row:has(.feedback-active) {
		opacity: 1;
	}
	.feedback-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #52524F;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.feedback-btn:hover:not(:disabled) {
		color: #858582;
		background: rgba(71,71,71,0.3);
	}
	.feedback-btn.feedback-active[title="Helpful"] {
		color: #4ade80;
	}
	.feedback-btn.feedback-active[title="Not helpful"] {
		color: #E21D48;
	}
	.feedback-btn:disabled:not(.feedback-active) {
		opacity: 0.2;
		cursor: default;
	}
	.feedback-btn:disabled.feedback-active {
		cursor: default;
	}

	/* 9. Skeleton loading */
	.skeleton-loader {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 4px 0;
	}
	.skeleton-line {
		height: 12px;
		border-radius: 6px;
		background: linear-gradient(90deg, rgba(226,29,72,0.06) 25%, rgba(226,29,72,0.14) 50%, rgba(226,29,72,0.06) 75%);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.5s ease-in-out infinite;
	}
	.skeleton-line:nth-child(2) { animation-delay: 0.15s; }
	.skeleton-line:nth-child(3) { animation-delay: 0.3s; }
	@keyframes skeleton-shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* 7. Retry button */
	.retry-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 12px;
		font-size: 12px;
		color: #F4F5F0;
		background: rgba(226,29,72,0.15);
		border: 1px solid rgba(226,29,72,0.25);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		width: fit-content;
	}
	.retry-btn:hover {
		background: rgba(226,29,72,0.25);
		border-color: rgba(226,29,72,0.4);
	}

	/* 2. Scroll to bottom button */
	.scroll-bottom-btn {
		position: absolute;
		bottom: 120px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 1px solid rgba(54,54,54,0.5);
		background: rgba(17,17,17,0.9);
		color: #858582;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0,0,0,0.4);
		transition: all 0.2s ease;
		animation: fade-in 0.2s ease;
	}
	.scroll-bottom-btn:hover {
		background: rgba(37,35,35,0.9);
		color: #F4F5F0;
		border-color: rgba(226,29,72,0.3);
	}
	@keyframes fade-in {
		from { opacity: 0; transform: translateX(-50%) translateY(4px); }
		to { opacity: 1; transform: translateX(-50%) translateY(0); }
	}

	/* 8. Follow-up suggestions */
	.follow-up-suggestions {
		animation: welcome-fade 0.3s ease-out both;
	}

	/* ===== INPUT ===== */
	.input-section {
		background: linear-gradient(0deg, rgba(17,17,17,0.9) 0%, transparent 100%);
		border-top: 1px solid rgba(54,54,54,0.3);
	}

	/* 10. Smoother focus ring transition */
	.input-wrapper {
		background: rgba(37,35,35,0.5);
		border: 1px solid rgba(54,54,54,0.4);
		transition: border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
					background 0.4s cubic-bezier(0.4, 0, 0.2, 1),
					box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.input-wrapper:focus-within,
	.input-focused {
		border-color: rgba(226,29,72,0.25);
		background: rgba(37,35,35,0.65);
		box-shadow: 0 0 0 2px rgba(226,29,72,0.05), 0 2px 8px rgba(226,29,72,0.06);
	}

	.input-wrapper textarea::placeholder {
		color: #52524F;
	}

	/* Mic button */
	.mic-btn {
		padding: 8px;
		background: transparent;
		border: 1px solid rgba(54,54,54,0.4);
		border-radius: 10px;
		color: #858582;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.mic-btn:hover:not(:disabled) {
		color: #F4F5F0;
		border-color: rgba(226,29,72,0.3);
		background: rgba(226,29,72,0.08);
	}
	.mic-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}
	.mic-btn.mic-active {
		color: #E21D48;
		border-color: rgba(226,29,72,0.4);
		background: rgba(226,29,72,0.12);
		animation: mic-pulse 1.5s ease-in-out infinite;
	}
	@keyframes mic-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(226,29,72,0.3); }
		50% { box-shadow: 0 0 0 6px rgba(226,29,72,0); }
	}

	.send-btn {
		padding: 8px;
		background: linear-gradient(135deg, #E21D48, #D90C2A);
		border: none;
		border-radius: 10px;
		color: white;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 2px 8px rgba(226,29,72,0.25);
	}
	.send-btn:hover:not(:disabled) {
		transform: scale(1.1);
		box-shadow: 0 4px 16px rgba(226,29,72,0.4);
	}
	.send-btn:active:not(:disabled) { transform: scale(0.93); }
	.send-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
		transform: none;
	}

	.kbd-key {
		padding: 1px 4px;
		background: rgba(37,35,35,0.8);
		border: 1px solid rgba(54,54,54,0.5);
		border-radius: 3px;
		color: #858582;
		font-family: monospace;
		font-size: 9px;
	}

	/* ===== SCROLLBAR ===== */
	.scrollbar-thin {
		scrollbar-width: thin;
		scrollbar-color: rgba(71,71,71,0.3) transparent;
		scroll-behavior: smooth;
	}
	.scrollbar-thin::-webkit-scrollbar { width: 4px; }
	.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
	.scrollbar-thin::-webkit-scrollbar-thumb {
		background-color: rgba(71,71,71,0.3);
		border-radius: 20px;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb:hover {
		background-color: rgba(71,71,71,0.5);
	}

	/* ===== MARKDOWN PROSE IN CHAT ===== */
	.prose-chat {
		line-height: 1.6;
		word-wrap: break-word;
		overflow-wrap: break-word;
		max-width: 100%;
		overflow-x: hidden;
	}
	.prose-chat :global(p) {
		margin: 0 0 0.5em 0;
	}
	.prose-chat :global(p:last-child) {
		margin-bottom: 0;
	}
	.prose-chat :global(strong) {
		color: #F4F5F0;
		font-weight: 600;
	}
	.prose-chat :global(em) {
		color: #d4d4d0;
		font-style: italic;
	}
	.prose-chat :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.4em;
		list-style-type: decimal;
	}
	.prose-chat :global(ul) {
		margin: 0.4em 0;
		padding-left: 1.4em;
		list-style-type: disc;
	}
	.prose-chat :global(li) {
		margin: 0.25em 0;
		padding-left: 0.2em;
	}
	.prose-chat :global(li::marker) {
		color: #E21D48;
	}
	.prose-chat :global(code) {
		background: rgba(226,29,72,0.1);
		border: 1px solid rgba(226,29,72,0.15);
		border-radius: 4px;
		padding: 1px 5px;
		font-size: 0.85em;
		color: #F87171;
		font-family: monospace;
	}
	.prose-chat :global(pre) {
		background: rgba(37,35,35,0.8);
		border: 1px solid rgba(54,54,54,0.5);
		border-radius: 8px;
		padding: 0.75em 1em;
		margin: 0.5em 0;
		overflow-x: auto;
	}
	.prose-chat :global(pre code) {
		background: none;
		border: none;
		padding: 0;
		color: #F4F5F0;
		font-size: 0.85em;
	}
	.prose-chat :global(a) {
		color: #F87171;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.prose-chat :global(a:hover) {
		color: #E21D48;
	}
	.prose-chat :global(blockquote) {
		border-left: 3px solid #E21D48;
		margin: 0.5em 0;
		padding: 0.25em 0.75em;
		color: #858582;
		background: rgba(226,29,72,0.04);
		border-radius: 0 6px 6px 0;
	}
	.prose-chat :global(h1),
	.prose-chat :global(h2),
	.prose-chat :global(h3) {
		color: #F4F5F0;
		font-weight: 600;
		margin: 0.6em 0 0.3em 0;
		line-height: 1.3;
	}
	.prose-chat :global(h1) { font-size: 1.1em; }
	.prose-chat :global(h2) { font-size: 1.05em; }
	.prose-chat :global(h3) { font-size: 1em; }
	.prose-chat :global(hr) {
		border: none;
		border-top: 1px solid rgba(54,54,54,0.5);
		margin: 0.75em 0;
	}
	.prose-chat :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.5em 0;
		font-size: 0.85em;
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	.prose-chat :global(thead) {
		display: table;
		width: 100%;
		table-layout: fixed;
	}
	.prose-chat :global(tbody) {
		display: table;
		width: 100%;
		table-layout: fixed;
	}
	.prose-chat :global(th) {
		background: rgba(226,29,72,0.08);
		color: #F4F5F0;
		font-weight: 600;
		text-align: left;
		padding: 6px 8px;
		border: 1px solid rgba(54,54,54,0.5);
		white-space: nowrap;
	}
	.prose-chat :global(td) {
		padding: 5px 8px;
		border: 1px solid rgba(54,54,54,0.4);
		color: #d4d4d0;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}
	.prose-chat :global(tr:hover) {
		background: rgba(37,35,35,0.4);
	}
</style>
