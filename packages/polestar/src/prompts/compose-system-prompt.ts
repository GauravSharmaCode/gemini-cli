import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const POLESTAR_MARKER = "<!-- polestar-x-system-prompt -->";

const defaultPromptPath = join(dirname(fileURLToPath(import.meta.url)), "system.md");

export function resolvePolestarPromptPath(overridePath?: string): string {
	if (overridePath && existsSync(overridePath)) {
		return overridePath;
	}
	const envPath = process.env.POLESTAR_SYSTEM_PROMPT_PATH;
	if (envPath && existsSync(envPath)) {
		return envPath;
	}
	return defaultPromptPath;
}

export function loadPolestarPromptBlock(overridePath?: string): string | undefined {
	const path = resolvePolestarPromptPath(overridePath);
	if (!existsSync(path)) {
		return undefined;
	}
	const text = readFileSync(path, "utf-8").trim();
	return text.length > 0 ? text : undefined;
}

/**
 * Prepend PoleStar sections above the dynamic harness prompt. Idempotent.
 */
export function composeSystemPrompt(basePrompt: string, overridePath?: string): string {
	if (basePrompt.includes(POLESTAR_MARKER)) {
		return basePrompt;
	}
	const block = loadPolestarPromptBlock(overridePath);
	if (!block) {
		return basePrompt;
	}
	return `${POLESTAR_MARKER}\n${block}\n\n${basePrompt}`;
}
