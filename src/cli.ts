#!/usr/bin/env node
import { existsSync } from "node:fs"
import { type BetterAuthOptions, logger } from "better-auth"
import { loadConfig } from "c12"
import { defineCommand, runMain } from "citty"
import { version } from "../package.json"
import { generateRemultSchema } from "./remult-generate-schema"
import { RemultBetterAuthError } from "./utils"
import { writeFile } from "node:fs/promises"

async function getBetterAuthOptions(configFile?: string) {
	const defaultOpts = {	} as BetterAuthOptions
	async function loadConfigFile(configFile?: string) {
		configFile = configFile ?? "./src/modules/auth/server/better-auth-config.ts"
		if (!existsSync(configFile)) {
// 			const content = `// FIRST RUN //
// import { betterAuth } from "better-auth";
// import { remultAdapter } from "@nerdfolio/remult-better-auth";
// import { InMemoryDataProvider } from "remult";

// // TODO: remove \`const authEntities = {};\` and use the import under.
// const authEntities = {};
// // import { authEntities } from "../entities";

// export default betterAuth({
//   // TODO: replace \`new InMemoryDataProvider()\` with remult or your dataProvider.
//   database: remultAdapter(new InMemoryDataProvider(), {
//     authEntities,
//   }),
// });
// `
const content = `// FIRST RUN //
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"

export const auth = betterAuth({
	database: memoryAdapter({}) //just to make better-auth happy. Not needed for schema gen
})`
			// Ensure all directories exist before writing the file
			await import("node:fs/promises").then(async fs => {
				const idx = configFile.lastIndexOf("/")
				const dir = idx !== -1 ? configFile.slice(0, idx) : "."
				await fs.mkdir(dir, { recursive: true })
				await fs.writeFile(configFile, content, { encoding: "utf-8" })
			})
		}

		const {
			config: {
				auth: { options },
			},
		} = await loadConfig<{
			auth: {
				options: BetterAuthOptions
			}
			default?: {
				options: BetterAuthOptions
			}
		}>({
			configFile,
			dotenv: true,
			defaults: { auth: { options: defaultOpts } },
		})

		const { user, account, session, verification, database, plugins } = options
		return Object.fromEntries(
			Object.entries({ user, account, session, verification, database, plugins })
				.filter(([_k, v]) => typeof v !== 'undefined')
		) satisfies BetterAuthOptions
	}

	return {
		source: configFile,
		options: await loadConfigFile(configFile),
	}
}

const generateCmd = defineCommand({
	meta: {
		name: "generate",
		description: "Generate Remult entities for better-auth",
	},
	args: {
		config: {
			type: "string",
			description: "Path to better-auth configuration",
		},
		output: {
			type: "string",
			description: "Path to output file",
			default: "./src/modules/auth/entities.ts",
		},
	},
	run: async ({ args: { config: configFile, output } }) => {
		const { source, options } = await getBetterAuthOptions(configFile)

		if (!source) {
			logger.info("No better-auth config file found. Using default options:", options)
		} else {
			logger.info("Using better-auth options from:", source)
			logger.info("options:", options)
		}
		return generateRemultSchema({ options, file: output })
	},
})

const main = defineCommand({
	meta: {
		name: "remult-better-auth",
		version: version ?? "_",
		description: "Cli to generate Remult entities for better-auth",
	},
	subCommands: {
		generate: generateCmd,
	},
})

runMain(main)
