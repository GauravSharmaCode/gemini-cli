import { classifyTask } from "./classify-task.ts";
import type { RouteRequest, RouteResult } from "./types.ts";

function isLocalModel(model: { provider: string; id: string }): boolean {
	const p = model.provider.toLowerCase();
	const id = model.id.toLowerCase();
	return p.includes("ollama") || p.includes("local") || id.includes("local") || model.provider === "custom";
}

function pickByClass(
	models: RouteRequest["availableModels"],
	taskClass: ReturnType<typeof classifyTask>,
): RouteResult["model"] {
	if (models.length === 0) return undefined;

	if (taskClass === "privacy_local") {
		return models.find(isLocalModel) ?? models[0];
	}

	if (taskClass === "architecture") {
		return models.find((m) => /opus|gpt-5|sonnet|pro/i.test(m.id)) ?? models.find((m) => m.reasoning) ?? models[0];
	}

	if (taskClass === "exploration") {
		return models.find((m) => /flash|mini|haiku|fast/i.test(m.id)) ?? models[0];
	}

	if (taskClass === "background") {
		return models.find((m) => /mini|flash|haiku|nano/i.test(m.id)) ?? models[0];
	}

	return models[0];
}

export function routeModel(request: RouteRequest): RouteResult {
	const taskClass = classifyTask(request.prompt, request.preferLocal);
	const model = pickByClass(request.availableModels, taskClass) ?? request.currentModel;
	return {
		taskClass,
		model,
		reason: `heuristic:${taskClass}`,
	};
}

export function buildFallbackChain(
	models: RouteRequest["availableModels"],
	primary?: RouteResult["model"],
): RouteResult["model"][] {
	if (!primary) return [...models];
	const rest = models.filter((m) => m !== primary && m.id !== primary.id);
	return [primary, ...rest];
}
