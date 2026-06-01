import type { Model } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { routeModel } from "./route-model.ts";

function mockModel(id: string, provider = "anthropic", reasoning = false): Model<any> {
	return {
		id,
		provider,
		name: id,
		api: "anthropic-messages",
		reasoning,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 8192,
	} as Model<any>;
}

describe("routeModel", () => {
	it("routes privacy prompts toward local when available", () => {
		const result = routeModel({
			prompt: "read my .env and fix API_KEY",
			availableModels: [mockModel("claude"), mockModel("llama3", "ollama")],
		});
		expect(result.taskClass).toBe("privacy_local");
		expect(result.model?.provider).toBe("ollama");
	});

	it("blocks routing to cloud models if privacy is requested but no local models are available", () => {
		const result = routeModel({
			prompt: "read my .env and fix API_KEY",
			availableModels: [mockModel("claude")],
		});
		expect(result.taskClass).toBe("privacy_local");
		expect(result.model).toBeUndefined();
		expect(result.reason).toBe("blocked:privacy_local:no_local_model_available");
	});
});
