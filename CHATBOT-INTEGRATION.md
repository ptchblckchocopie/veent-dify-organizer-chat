# Veent AI Chatbot - Integration Guide

A floating AI assistant widget powered by Dify. Drop it into any SvelteKit app.

---

## Quick Start

```svelte
<script>
  import FloatingAiAssistant from '$lib/components/ui/FloatingAiAssistant.svelte';
</script>

<FloatingAiAssistant />
```

That's it. The widget renders a draggable floating button in the bottom-right corner.

---

## Required Files

Copy these into your SvelteKit project, preserving the folder structure:

```
src/
  lib/
    components/
      ui/
        FloatingAiAssistant.svelte    # The chatbot widget (UI + logic)
  routes/
    api/
      chat/
        +server.ts                    # Proxies messages to Dify API (streaming)
      feedback/
        +server.ts                    # Sends like/dislike feedback to Dify API
```

### File Descriptions

| File | Purpose |
|------|---------|
| `FloatingAiAssistant.svelte` | Self-contained chat widget with all styles scoped. Handles streaming responses, markdown rendering, speech-to-text, copy, feedback, localStorage persistence. |
| `api/chat/+server.ts` | POST endpoint. Receives `{ message, conversation_id }`, forwards to Dify's `/chat-messages` API, and streams the SSE response back. |
| `api/feedback/+server.ts` | POST endpoint. Receives `{ message_id, rating }` (rating: `"like"`, `"dislike"`, or `null`), forwards to Dify's feedback API. |

---

## Dependencies

Install these in your project:

```bash
npm install lucide-svelte marked
```

| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-svelte` | `^0.469.0` | Icons (Send, Bot, Mic, ThumbsUp, etc.) |
| `marked` | `^17.0.4` | Renders markdown in bot responses |

---

## Environment Variables

Add these to your `.env` file:

```env
DIFY_API_KEY=app-vkEa4D2xZSrNx4mXPsUeODcU
DIFY_API_URL=https://api.dify.ai/v1
```

| Variable | Description |
|----------|-------------|
| `DIFY_API_KEY` | Your Dify application API key (starts with `app-`) |
| `DIFY_API_URL` | Dify API base URL |

The API routes use `$env/dynamic/private` to read these at runtime.

---

## Features Included

- **Streaming responses** - Messages appear word-by-word via SSE
- **Markdown rendering** - Bot responses render headings, lists, code blocks, links, etc.
- **Draggable button** - Users can drag the floating button anywhere on screen
- **Speech-to-text** - Mic button for voice input (Web Speech API, Chrome/Edge/Safari)
- **Copy button** - Copy bot responses to clipboard (works on HTTP and HTTPS)
- **Like/Dislike feedback** - Sends ratings back to Dify for analytics
- **Message persistence** - Chat history survives page refresh (localStorage)
- **Auto-resize input** - Textarea grows with multi-line input
- **Scroll-to-bottom button** - Appears when scrolled up in conversation
- **Timestamps** - Relative timestamps on all messages
- **Skeleton loading** - Shimmer animation while waiting for response
- **Error retry** - Retry button on failed messages
- **Mobile full-screen** - Goes full-screen on screens < 640px
- **Beta badge** - Shows "Live" and "Beta" tags in the header

---

## Customization

### Branding Colors

The widget uses Veent brand colors defined at the top of the `<style>` block:

```css
/* Dark BG:    #111111, #171717, #252323 */
/* Surface:    #252323, #474747 */
/* Cream text: #F4F5F0 */
/* Muted text: #858582 */
/* Red accent: #E21D48 / #D90C2A */
/* Border:     #363636 */
```

Search and replace these values to match your brand.

### Welcome Message

Edit the welcome section in `FloatingAiAssistant.svelte` to change:
- Bot name (currently "Vee")
- Tagline (currently "Dashboard Assistant")
- Welcome text
- Suggested prompt chips

### Chat Width

Default is `420px`. Change `w-[420px]` in the chat container class.

---

## Architecture

```
User types message
    |
    v
FloatingAiAssistant.svelte
    |
    |-- POST /api/chat  { message, conversation_id }
    |       |
    |       v
    |   +server.ts --> Dify /chat-messages (streaming)
    |       |
    |       v
    |   SSE stream back to widget
    |
    |-- POST /api/feedback  { message_id, rating }
            |
            v
        +server.ts --> Dify /messages/:id/feedbacks
```

---

## Notes

- The widget is **framework-specific to SvelteKit** (Svelte 5 runes syntax). For React/Vue/Angular, the component needs to be rewritten, but the API routes can be adapted to any Node.js backend.
- The API routes act as a **proxy** to keep the Dify API key server-side (never exposed to the browser).
- Speech-to-text uses the **Web Speech API** (browser-native). It only appears in supported browsers and requires microphone permission.
- The clipboard copy uses `navigator.clipboard` on HTTPS and falls back to `document.execCommand('copy')` on HTTP.
- localStorage keys used: `vee-messages`, `vee-conversation-id`. Change these if you have naming conflicts.
