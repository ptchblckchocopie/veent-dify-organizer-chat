import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

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

		// If section is very long, split by Q&A pairs or double newlines
		if (trimmed.length > 800) {
			const subChunks = trimmed.split(/(?=\*\*Q:)/m);
			if (subChunks.length > 1) {
				for (const sub of subChunks) {
					const s = sub.trim();
					if (s.length >= 20) {
						result.push({ content: s, source, section: firstLine });
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
		console.error('Knowledge base directory not found');
		return;
	}

	const seen = new Set<string>();
	const files = getAllMdFiles(kbPath);

	for (const file of files) {
		const name = basename(file);
		// Deduplicate files with same name across directories (prefer root)
		if (seen.has(name)) continue;
		seen.add(name);

		const content = readFileSync(file, 'utf-8');
		const docChunks = chunkDocument(content, name);
		chunks.push(...docChunks);
	}

	loaded = true;
	console.log(`[RAG] Loaded ${chunks.length} chunks from ${seen.size} documents`);
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
	if (queryTokens.length === 0) return [];

	// Score each chunk using TF-based ranking
	const scored = chunks.map(chunk => {
		const chunkText = chunk.content.toLowerCase();
		const chunkTokens = tokenize(chunkText);

		let score = 0;

		for (const qt of queryTokens) {
			// Exact word match
			const count = chunkTokens.filter(ct => ct === qt).length;
			score += count * 3;

			// Partial match (substring)
			const partialCount = chunkTokens.filter(ct => ct.includes(qt) || qt.includes(ct)).length;
			score += partialCount * 1;

			// Boost for match in section title
			if (chunk.section.toLowerCase().includes(qt)) {
				score += 5;
			}
		}

		// Boost Q&A formatted chunks (they're usually most useful)
		if (chunkText.includes('**q:') || chunkText.includes('q:')) {
			score *= 1.3;
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
		.map((c, i) => `[Source: ${c.source}]\n${c.content}`)
		.join('\n\n---\n\n');
}
