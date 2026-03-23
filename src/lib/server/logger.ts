import { createHash } from 'crypto';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
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
