import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		includeSource: [
			'./src/**/*.{js,jsx,ts,tsx,mjs,mts}',
		],
	},
})
