import { describe, expect, it } from "vitest";
import { composeSystemPrompt } from "./compose-system-prompt.ts";

describe("composeSystemPrompt", () => {
	it("prepends polestar block and preserves base", () => {
		const result = composeSystemPrompt("BASE_PROMPT");
		expect(result).toContain("BASE_PROMPT");
		expect(result).toContain("PoleStar-X");
		expect(result).toContain("destructive");
	});

	it("is idempotent", () => {
		const once = composeSystemPrompt("BASE");
		const twice = composeSystemPrompt(once);
		expect(twice).toBe(once);
	});
});
