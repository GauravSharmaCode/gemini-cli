#!/usr/bin/env node
/**
 * PoleStar-X CLI entry. Sets app package identity, then runs the inherited coding-agent runtime.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const polestarPackageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.POLESTAR_APP_PACKAGE_DIR = polestarPackageRoot;
process.title = "polestar";
process.env.POLESTAR_X = "true";

const { configureHttpDispatcher } = await import("../../coding-agent/src/core/http-dispatcher.ts");
const { main } = await import("../../coding-agent/src/main.ts");
const { polestarCoreExtension } = await import("./extension/polestar-core.ts");

configureHttpDispatcher();
await main(process.argv.slice(2), {
	// Runtime-loaded extension; cast avoids duplicate src/dist ExtensionAPI types under tsx.
	extensionFactories: [polestarCoreExtension as never],
});
