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
): RouteResult["model"] | null {
	if (models.length === 0) return undefined;

	if (taskClass === "privacy_local") {
		const local = models.find(isLocalModel);
		if (local) {
			return local;
		}
		// Hard block: do not return a cloud model if privacy_local is requested and no local model is available
		return null;
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
	const modelResult = pickByClass(request.availableModels, taskClass);

	if (modelResult === null) {
		return {
			taskClass,
			model: undefined,
			reason: `blocked:privacy_local:no_local_model_available`,
		};
	}

	const model = modelResult ?? request.currentModel;
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
