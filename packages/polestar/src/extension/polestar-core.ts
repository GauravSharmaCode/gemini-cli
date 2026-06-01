import { Type } from "typebox";
import type { ExtensionAPI, ExtensionFactory } from "../../../coding-agent/src/core/extensions/types.ts";
import { createMemoryBackend } from "../memory/backend.ts";
import { formatHistoricalMemoryBlock } from "../memory/format.ts";
import { composeSystemPrompt } from "../prompts/compose-system-prompt.ts";
import { routeModel } from "../router/route-model.ts";
import { classifyFailure } from "../self-heal/classify-failure.ts";
import { decideRetry } from "../self-heal/retry-policy.ts";
import { scaffoldSkill } from "../tools/self-config.ts";

const MEMORY_SEARCH_TIMEOUT_MS = 1500;

export const polestarCoreExtension: ExtensionFactory = (pi: ExtensionAPI) => {
	const memory = createMemoryBackend(async (cmd, args) => {
		const result = await pi.exec(cmd, args, { timeout: MEMORY_SEARCH_TIMEOUT_MS });
		return { stdout: result.stdout, code: result.code };
	});

	pi.on("resources_discover", async (event) => {
		const { existsSync, readdirSync } = await import("node:fs");
		const { join } = await import("node:path");
		const skillsDir = join(event.cwd, ".polestar", "skills");
		const skillPaths: string[] = [];
		if (existsSync(skillsDir)) {
			try {
				const files = readdirSync(skillsDir, { withFileTypes: true });
				for (const file of files) {
					if (file.isDirectory()) {
						const skillMd = join(skillsDir, file.name, "SKILL.md");
						if (existsSync(skillMd)) {
							skillPaths.push(skillMd);
						}
					}
				}
			} catch {
				// Ignore directory read errors
			}
		}
		return { skillPaths };
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const systemPrompt = composeSystemPrompt(event.systemPrompt);
		const memoryMd = await memory.readMemoryFile();
		const mergedPrompt = memoryMd ? `${systemPrompt}\n\n## Long-term memory\n${memoryMd}` : systemPrompt;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), MEMORY_SEARCH_TIMEOUT_MS);
		let memoryBlock: string | undefined;
		try {
			const results = await memory.search(event.prompt, controller.signal);
			memoryBlock = formatHistoricalMemoryBlock(results);
		} catch {
			memoryBlock = undefined;
		} finally {
			clearTimeout(timer);
		}

		const available = ctx.modelRegistry.getAvailable();
		if (available.length > 0) {
			const route = routeModel({
				prompt: event.prompt,
				currentModel: ctx.model,
				availableModels: available,
			});
			if (route.model) {
				await pi.setModel(route.model);
			} else if (route.taskClass === "privacy_local") {
				// We have a privacy_local task but no local model was found. Stop execution to prevent data leakage.
				throw new Error(
					"Security Block: This task involves sensitive/privacy data, but no local model (Ollama/local) is available to handle it safely.",
				);
			}
		}

		if (memoryBlock) {
			return {
				systemPrompt: mergedPrompt,
				message: {
					customType: "polestar_memory",
					content: memoryBlock,
					display: "Historical memory",
				},
			};
		}

		return { systemPrompt: mergedPrompt };
	});

	pi.on("agent_end", async () => {
		// Auto-logging off by default — explicit tools/commands only.
	});

	pi.registerTool({
		name: "memory_search",
		label: "Memory Search",
		description: "Search pi-memory for relevant prior work",
		parameters: Type.Object({
			query: Type.String(),
		}),
		async execute(_id, params) {
			const results = await memory.search(params.query);
			return {
				content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
				details: results,
			};
		},
	});

	pi.registerTool({
		name: "memory_log_learning",
		label: "Memory Log",
		description: "Log a learning note to pi-memory",
		parameters: Type.Object({
			summary: Type.String(),
			tags: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const tags = params.tags
				?.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await memory.logLearning(params.summary, tags);
			return { content: [{ type: "text", text: "logged" }], details: {} };
		},
	});

	pi.registerTool({
		name: "manage_skill",
		label: "Manage Skill",
		description: "Scaffold a new SKILL.md under the agent skills directory",
		parameters: Type.Object({
			name: Type.String(),
			description: Type.String(),
			body: Type.String(),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const path = scaffoldSkill({
				name: params.name,
				description: params.description,
				body: params.body,
				skillsDir: `${ctx.cwd}/.polestar/skills`,
			});
			// Trigger a reload of resources so the newly scaffolded skill is registered and loaded by the harness
			if ("reload" in ctx && typeof ctx.reload === "function") {
				try {
					await ctx.reload();
				} catch {
					// Ignore reload errors during tool execution
				}
			}
			return { content: [{ type: "text", text: `Created and loaded ${path}` }], details: { path } };
		},
	});

	pi.registerCommand("remember", {
		description: "Log a learning note to pi-memory",
		handler: async (args, ctx) => {
			const summary = args.trim();
			if (!summary) {
				ctx.ui.notify("Usage: /remember <text>", "warning");
				return;
			}
			await memory.logLearning(summary);
			ctx.ui.notify("Remembered.", "info");
		},
	});

	pi.registerCommand("init", {
		description: "Bootstrap PoleStar config directory and defaults",
		handler: async (_args, ctx) => {
			const { mkdirSync, writeFileSync, existsSync } = await import("node:fs");
			const { join } = await import("node:path");
			const dir = join(ctx.cwd, ".polestar");
			mkdirSync(dir, { recursive: true });
			const settingsPath = join(dir, "settings.json");
			if (!existsSync(settingsPath)) {
				writeFileSync(
					settingsPath,
					JSON.stringify({ version: 1, memory: { enabled: true }, router: { auto: true } }, null, 2),
					"utf-8",
				);
			}
			ctx.ui.notify(`Initialized ${dir}`, "info");
		},
	});

	pi.registerCommand("recall", {
		description: "Search pi-memory and print top matches",
		handler: async (args, ctx) => {
			const query = args.trim() || "recent work";
			const results = await memory.search(query);
			const block = formatHistoricalMemoryBlock(results) ?? "No matches.";
			ctx.ui.notify(block, "info");
		},
	});

	pi.on("tool_result", async (event) => {
		if (event.toolName !== "bash" || !event.isError) return;
		const text = event.content.map((c) => ("text" in c ? c.text : "")).join("\n");
		const failureClass = classifyFailure({
			command: String(event.input.command ?? ""),
			stdout: text,
			stderr: text,
			exitCode: 1,
		});
		const decision = decideRetry(failureClass, 0);
		if (!decision.shouldRetry) return;
		return {
			content: [
				{
					type: "text",
					text: `${text}\n\n[polestar-self-heal] ${decision.reason}. Diagnose root cause before retrying.`,
				},
			],
		};
	});
};
