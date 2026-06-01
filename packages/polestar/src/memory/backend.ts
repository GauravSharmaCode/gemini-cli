export interface MemorySearchResult {
	path: string;
	snippet: string;
	score: number;
}

export interface MemoryBackend {
	search(query: string, signal?: AbortSignal): Promise<MemorySearchResult[]>;
	logLearning(summary: string, tags?: string[]): Promise<void>;
	readMemoryFile(): Promise<string | undefined>;
}

export class CliMemoryBackend implements MemoryBackend {
	private readonly exec: (cmd: string, args: string[]) => Promise<{ stdout: string; code: number }>;

	constructor(exec: (cmd: string, args: string[]) => Promise<{ stdout: string; code: number }>) {
		this.exec = exec;
	}

	async search(query: string, signal?: AbortSignal): Promise<MemorySearchResult[]> {
		const { stdout, code } = await this.exec("pi-memory", ["search", query, "--json"]);
		if (signal?.aborted || code !== 0) return [];
		try {
			const parsed = JSON.parse(stdout) as { results?: MemorySearchResult[] };
			return parsed.results ?? [];
		} catch {
			return [];
		}
	}

	async logLearning(summary: string, tags: string[] = []): Promise<void> {
		const args = ["log", "learning", "--summary", summary];
		if (tags.length > 0) args.push("--tags", tags.join(","));
		await this.exec("pi-memory", args);
	}

	async readMemoryFile(): Promise<string | undefined> {
		const { stdout, code } = await this.exec("pi-memory", ["get", "MEMORY.md"]);
		if (code !== 0) return undefined;
		const text = stdout.trim();
		return text.length > 0 ? text : undefined;
	}
}

export class NoopMemoryBackend implements MemoryBackend {
	async search(): Promise<MemorySearchResult[]> {
		return [];
	}
	async logLearning(): Promise<void> {}
	async readMemoryFile(): Promise<string | undefined> {
		return undefined;
	}
}

export function createMemoryBackend(
	exec?: (cmd: string, args: string[]) => Promise<{ stdout: string; code: number }>,
): MemoryBackend {
	if (!exec) return new NoopMemoryBackend();
	return new CliMemoryBackend(exec);
}
