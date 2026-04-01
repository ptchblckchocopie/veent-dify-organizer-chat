import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { serverLog } from './server-log';

interface Chunk {
	content: string;
	source: string;
	section: string;
}

let chunks: Chunk[] = [];
let loaded = false;

function chunkDocument(content: string, source: string): Chunk[] {
	const result: Chunk[] = [];
	const sections = content.split(/(?=^#{2,3}\s)/m);

	for (const section of sections) {
		const trimmed = section.trim();
		if (!trimmed || trimmed.length < 20) continue;

		const firstLine = trimmed.split('\n')[0].replace(/^#+\s*/, '').trim();

		if (trimmed.length > 800) {
			const subChunks = trimmed.split(/(?=^###\s|\*\*Q|\*\*How|\*\*What|\*\*Can)/m);
			if (subChunks.length > 1) {
				for (const sub of subChunks) {
					const s = sub.trim();
					if (s.length >= 20) {
						const subFirstLine = s.startsWith('#') ? s.split('\n')[0].replace(/^#+\s*/, '').trim() : firstLine;
						result.push({ content: s, source, section: subFirstLine });
					}
				}
				continue;
			}
		}

		result.push({ content: trimmed, source, section: firstLine });
	}

	return result;
}

function loadKnowledgeBase() {
	if (loaded) return;

	const possiblePaths = [
		join(process.cwd(), 'knowledge-base-tix'),
		join(process.cwd(), '..', 'knowledge-base-tix'),
		'/app/knowledge-base-tix'
	];

	let kbPath = '';
	for (const p of possiblePaths) {
		try {
			statSync(p);
			kbPath = p;
			break;
		} catch { /* continue */ }
	}

	if (!kbPath) {
		serverLog('error', 'rag-tix', 'Knowledge base directory not found');
		return;
	}

	const files = readdirSync(kbPath).filter(f => f.endsWith('.md'));

	for (const file of files) {
		const content = readFileSync(join(kbPath, file), 'utf-8');
		const docChunks = chunkDocument(content, file);
		chunks.push(...docChunks);
	}

	loaded = true;
	serverLog('info', 'rag-tix', `Loaded ${chunks.length} chunks from ${files.length} documents`);
}

function stem(word: string): string {
	return word
		.replace(/ing$/, '')
		.replace(/tion$/, '')
		.replace(/sion$/, '')
		.replace(/ment$/, '')
		.replace(/ers?$/, '')
		.replace(/ies$/, 'y')
		.replace(/s$/, '');
}

function tokenize(text: string): string[] {
	return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

export function searchTix(query: string, topK = 5): Chunk[] {
	loadKnowledgeBase();
	if (chunks.length === 0) return [];

	const queryTokens = tokenize(query);
	const queryStemmed = queryTokens.map(stem);
	if (queryTokens.length === 0) return [];

	const queryLower = query.toLowerCase();

	const scored = chunks.map(chunk => {
		const chunkText = chunk.content.toLowerCase();
		const chunkTokens = tokenize(chunkText);
		const chunkStemmed = chunkTokens.map(stem);
		const sectionLower = chunk.section.toLowerCase();

		let score = 0;

		for (let i = 0; i < queryTokens.length; i++) {
			const qt = queryTokens[i];
			const qs = queryStemmed[i];

			score += chunkTokens.filter(ct => ct === qt).length * 3;
			score += chunkStemmed.filter(cs => cs === qs).length * 2;
			score += chunkTokens.filter(ct => ct.includes(qt) || qt.includes(ct)).length;

			if (sectionLower.includes(qt)) score += 5;
			if (stem(sectionLower).includes(qs)) score += 3;
		}

		if (queryTokens.length >= 2) {
			for (let i = 0; i < queryTokens.length - 1; i++) {
				if (chunkText.includes(queryTokens[i] + ' ' + queryTokens[i + 1])) score += 8;
			}
		}

		if (chunkText.includes('**q') || chunkText.includes('q:')) score *= 1.2;
		if (chunk.content.length < 50) score *= 0.3;

		return { chunk, score };
	});

	return scored
		.filter(s => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map(s => s.chunk);
}

export function formatTixContext(chunks: Chunk[]): string {
	if (chunks.length === 0) return '';
	return chunks.map(c => `[Source: ${c.source}]\n${c.content}`).join('\n\n---\n\n');
}
