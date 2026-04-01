import { createHash } from 'crypto';
import { appendFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');

function ensureLogDir() {
	if (!existsSync(LOG_DIR)) {
		mkdirSync(LOG_DIR, { recursive: true });
	}
}

function hashIp(ip: string): string {
	return createHash('sha256').update(ip).digest('hex').slice(0, 12);
}

function getLogFile(): string {
	const date = new Date().toISOString().split('T')[0];
	return join(LOG_DIR, `chat-${date}.jsonl`);
}

export function logChat(params: {
	bot: 'organizer' | 'tix';
	ip: string;
	query: string;
	conversationId: string;
}) {
	try {
		ensureLogDir();
		const entry = {
			timestamp: new Date().toISOString(),
			bot: params.bot,
			ipHash: hashIp(params.ip),
			query: params.query.slice(0, 500),
			conversationId: params.conversationId || 'new'
		};
		appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
	} catch {
		// Logging should never break the app
	}
}

export function getRecentLogs(limit = 100): any[] {
	try {
		ensureLogDir();
		const files = readdirSync(LOG_DIR)
			.filter(f => f.startsWith('chat-') && f.endsWith('.jsonl'))
			.sort()
			.reverse();

		const logs: any[] = [];
		for (const file of files) {
			if (logs.length >= limit) break;
			const content = readFileSync(join(LOG_DIR, file), 'utf-8');
			const lines = content.trim().split('\n').filter(Boolean).reverse();
			for (const line of lines) {
				if (logs.length >= limit) break;
				try {
					logs.push(JSON.parse(line));
				} catch { /* skip malformed */ }
			}
		}
		return logs;
	} catch {
		return [];
	}
}

export function getLogStats() {
	try {
		ensureLogDir();
		const files = readdirSync(LOG_DIR)
			.filter(f => f.startsWith('chat-') && f.endsWith('.jsonl'))
			.sort()
			.reverse();

		let totalEntries = 0;
		const dailyCounts: Record<string, { organizer: number; tix: number }> = {};

		for (const file of files.slice(0, 14)) {
			const date = file.replace('chat-', '').replace('.jsonl', '');
			const content = readFileSync(join(LOG_DIR, file), 'utf-8');
			const lines = content.trim().split('\n').filter(Boolean);
			totalEntries += lines.length;

			dailyCounts[date] = { organizer: 0, tix: 0 };
			for (const line of lines) {
				try {
					const entry = JSON.parse(line);
					if (entry.bot === 'tix') dailyCounts[date].tix++;
					else dailyCounts[date].organizer++;
				} catch { /* skip */ }
			}
		}

		return { totalEntries, dailyCounts, logFiles: files.length };
	} catch {
		return { totalEntries: 0, dailyCounts: {}, logFiles: 0 };
	}
}
