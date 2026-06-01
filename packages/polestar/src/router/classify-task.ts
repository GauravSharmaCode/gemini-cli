import type { TaskClass } from "./types.ts";

const PRIVACY_PATTERNS = [/\.env\b/i, /secret/i, /password/i, /api[_-]?key/i, /credential/i, /token/i];

const ARCH_PATTERNS = [/architect/i, /design/i, /refactor plan/i, /roadmap/i, /migrate/i];

const EXPLORATION_PATTERNS = [/find all/i, /search the repo/i, /where is/i, /grep/i, /across the codebase/i];

export function classifyTask(prompt: string, preferLocal = false): TaskClass {
	if (preferLocal || PRIVACY_PATTERNS.some((p) => p.test(prompt))) {
		return "privacy_local";
	}
	if (ARCH_PATTERNS.some((p) => p.test(prompt))) {
		return "architecture";
	}
	if (EXPLORATION_PATTERNS.some((p) => p.test(prompt))) {
		return "exploration";
	}
	if (prompt.length < 80 && !prompt.includes("\n")) {
		return "background";
	}
	return "code_edit";
}
