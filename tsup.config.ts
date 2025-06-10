import { defineConfig, type Options } from "tsup"

const libCfg = {
	entry: ["src/index.ts"],
	splitting: false,
	target: "node22",
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	outExtension({ format }) {
		return { js: format === "esm" ? ".mjs" : format === "cjs" ? ".cjs" : ".js" }
	},
} satisfies Options

const cliCfg = {
	...libCfg,
	entry: ["src/cli.ts"],
	format: "esm",
	dts: false
} satisfies Options

export default defineConfig([libCfg, cliCfg])
