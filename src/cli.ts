#!/usr/bin/env node
import { existsSync } from "node:fs"
import { type BetterAuthOptions, logger } from "better-auth"
import { loadConfig } from "c12"
import { defineCommand, runMain } from "citty"
import { version } from "../package.json"
import { generateRemultModule, generateRemultSchema } from "./remult-generate-schema"
import { writeFile } from "./utils"

async function getBetterAuthOptions(configFile?: string) {
	const defaultOpts = {	} as BetterAuthOptions
	let firstRun = false
	async function loadConfigFile(configFile?: string) {
		configFile = configFile ?? "./src/modules/auth/server/better-auth-config.ts"
		if (!existsSync(configFile)) {
			firstRun = true
const content = `import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"

export const auth = betterAuth({
	database: memoryAdapter({}) //just to make better-auth happy. Not needed for schema gen
})`
			await writeFile(configFile, content)
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
		firstRun
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
		const { source, options, firstRun } = await getBetterAuthOptions(configFile)

		if (!source) {
			logger.info("No better-auth config file found. Using default options:", options)
		} else {
			logger.info("Using better-auth options from:", source)
			logger.info("options:", options)
		}
		await generateRemultSchema({ options, file: output })
		if(firstRun){
			await generateRemultModule({modulePath: "./src/modules/auth"})
		}
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
