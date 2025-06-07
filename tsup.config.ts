import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: false,
	target: "node22",
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	outExtension({ format }) {
		return { js: (format === "esm" ? ".mjs" : format === "cjs" ? ".cjs" : ".js") }
	},
})