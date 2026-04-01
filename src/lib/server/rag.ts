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

function getAllMdFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...getAllMdFiles(full));
		} else if (entry.endsWith('.md')) {
			files.push(full);
		}
	}
	return files;
}

function chunkDocument(content: string, source: string): Chunk[] {
	const result: Chunk[] = [];
	// Split by ## or ### headers
	const sections = content.split(/(?=^#{2,3}\s)/m);

	for (const section of sections) {
		const trimmed = section.trim();
		if (!trimmed || trimmed.length < 20) continue;

		// Extract section title from first line
		const firstLine = trimmed.split('\n')[0].replace(/^#+\s*/, '').trim();

		// If section is very long, split by Q&A pairs
		if (trimmed.length > 800) {
			const subChunks = trimmed.split(/(?=\*\*Q:)/m);
			if (subChunks.length > 1) {
				for (const sub of subChunks) {
					const s = sub.trim();
					if (s.length >= 20) {
						// Preserve section header in each sub-chunk for context
						const subFirstLine = s.startsWith('**Q:') ? firstLine : s.split('\n')[0].replace(/^#+\s*/, '').trim();
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

	// Try multiple possible paths (dev vs Docker)
	const possiblePaths = [
		join(process.cwd(), 'knowledge-base'),
		join(process.cwd(), '..', 'knowledge-base'),
		'/app/knowledge-base'
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
		serverLog('error', 'rag', 'Knowledge base directory not found');
		return;
	}

	// Collect all files, prefer longer version when filenames collide
	const filesByName = new Map<string, { path: string; size: number }>();
	const files = getAllMdFiles(kbPath);

	for (const file of files) {
		const name = basename(file);
		const size = statSync(file).size;
		const existing = filesByName.get(name);
		// Keep the longer/more detailed version
		if (!existing || size > existing.size) {
			filesByName.set(name, { path: file, size });
		}
	}

	for (const [name, { path }] of filesByName) {
		const content = readFileSync(path, 'utf-8');
		const docChunks = chunkDocument(content, name);
		chunks.push(...docChunks);
	}

	loaded = true;
	serverLog('info', 'rag', `Loaded ${chunks.length} chunks from ${filesByName.size} documents`);
}

// Simple stemming — strip common suffixes for better matching
function stem(word: string): string {
	return word
		.replace(/ing$/, '')
		.replace(/tion$/, '')
		.replace(/sion$/, '')
		.replace(/ment$/, '')
		.replace(/ness$/, '')
		.replace(/able$/, '')
		.replace(/ible$/, '')
		.replace(/ous$/, '')
		.replace(/ive$/, '')
		.replace(/ers?$/, '')
		.replace(/ies$/, 'y')
		.replace(/s$/, '');
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, ' ')
		.split(/\s+/)
		.filter(w => w.length > 2);
}

export function search(query: string, topK = 5): Chunk[] {
	loadKnowledgeBase();

	if (chunks.length === 0) return [];

	const queryTokens = tokenize(query);
	const queryStemmed = queryTokens.map(stem);
	if (queryTokens.length === 0) return [];

	// Also check for multi-word phrases in the query
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

			// Exact word match
			const exactCount = chunkTokens.filter(ct => ct === qt).length;
			score += exactCount * 3;

			// Stemmed match (e.g., "scanner" matches "scanning")
			const stemCount = chunkStemmed.filter(cs => cs === qs).length;
			score += stemCount * 2;

			// Partial match (substring)
			const partialCount = chunkTokens.filter(ct => ct.includes(qt) || qt.includes(ct)).length;
			score += partialCount * 1;

			// Boost for match in section title
			if (sectionLower.includes(qt)) {
				score += 5;
			}
			// Stemmed match in section title
			if (stem(sectionLower).includes(qs)) {
				score += 3;
			}
		}

		// Phrase matching — boost if consecutive query words appear together in content
		if (queryTokens.length >= 2) {
			for (let i = 0; i < queryTokens.length - 1; i++) {
				const phrase = queryTokens[i] + ' ' + queryTokens[i + 1];
				if (chunkText.includes(phrase)) {
					score += 8;
				}
			}
		}

		// Boost Q&A formatted chunks
		if (chunkText.includes('**q:') || chunkText.includes('q:')) {
			score *= 1.2;
		}

		// Boost chunks that contain the word "default" when query asks about defaults
		if (queryLower.includes('default') && chunkText.includes('default')) {
			score += 10;
		}

		// Penalize very short chunks
		if (chunk.content.length < 50) {
			score *= 0.3;
		}

		return { chunk, score };
	});

	return scored
		.filter(s => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map(s => s.chunk);
}

export function formatContext(chunks: Chunk[]): string {
	if (chunks.length === 0) return '';

	return chunks
		.map((c) => `[Source: ${c.source}]\n${c.content}`)
		.join('\n\n---\n\n');
}
