export type LogLevel = 'info' | 'warn' | 'error';
export type LogSource = 'groq' | 'groq-tix' | 'rag' | 'rag-tix' | 'rate-limit' | 'server' | 'chat' | 'health';

export interface ServerLogEntry {
	id: number;
	timestamp: string;
	level: LogLevel;
	source: LogSource;
	message: string;
	details?: string;
	stack?: string;
	context?: Record<string, unknown>;
}

const entries: ServerLogEntry[] = [];
const MAX_ENTRIES = 500;
let nextId = 1;

function extractStack(err: unknown): string | undefined {
	if (err instanceof Error && err.stack) return err.stack;
	if (typeof err === 'string') return undefined;
	return undefined;
}

function extractMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}

export function serverLog(
	level: LogLevel,
	source: LogSource,
	message: string,
	extra?: string | Error | { error?: unknown; details?: string; context?: Record<string, unknown> }
) {
	let details: string | undefined;
	let stack: string | undefined;
	let context: Record<string, unknown> | undefined;

	if (extra instanceof Error) {
		details = extra.message;
		stack = extra.stack;
	} else if (typeof extra === 'string') {
		details = extra;
	} else if (extra && typeof extra === 'object') {
		details = extra.details;
		context = extra.context;
		if (extra.error) {
			const errMsg = extractMessage(extra.error);
			const errStack = extractStack(extra.error);
			details = details ? `${details} | ${errMsg}` : errMsg;
			if (errStack) stack = errStack;
		}
	}

	const entry: ServerLogEntry = {
		id: nextId++,
		timestamp: new Date().toISOString(),
		level,
		source,
		message,
		details,
		stack,
		context
	};

	entries.push(entry);
	if (entries.length > MAX_ENTRIES) entries.shift();

	// Also forward to console so Docker / pm2 logs still work
	const tag = `[${source}]`;
	if (level === 'error') console.error(tag, message, details || '', stack || '');
	else if (level === 'warn') console.warn(tag, message, details || '');
	else console.log(tag, message, details || '');
}

export function getServerLogs(limit = 200): ServerLogEntry[] {
	return entries.slice(-limit).reverse();
}

export function getServerLogsSummary() {
	const now = Date.now();
	const last1h = entries.filter(e => now - new Date(e.timestamp).getTime() < 60 * 60 * 1000);

	return {
		total: entries.length,
		lastHour: {
			info: last1h.filter(e => e.level === 'info').length,
			warn: last1h.filter(e => e.level === 'warn').length,
			error: last1h.filter(e => e.level === 'error').length
		},
		bySource: Object.fromEntries(
			(['groq', 'groq-tix', 'rag', 'rag-tix', 'rate-limit', 'server', 'chat', 'health'] as LogSource[])
				.map(s => [s, entries.filter(e => e.source === s).length])
				.filter(([, count]) => (count as number) > 0)
		)
	};
}
