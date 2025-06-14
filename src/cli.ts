#!/usr/bin/env node
import { existsSync } from "node:fs"
import { type BetterAuthOptions, logger } from "better-auth"
import { loadConfig } from "c12"
import { defineCommand, runMain } from "citty"
import { version } from "../package.json"
import { generateRemultSchema } from "./remult-generate-schema"
import { RemultBetterAuthError } from "./utils"

async function getBetterAuthOptions(configFile?: string) {
	const defaultOpts = {} as BetterAuthOptions
	async function loadConfigFile(configFile: string) {
		if (!existsSync(configFile)) {
			throw new RemultBetterAuthError(`configFile does not exist: ${configFile}`)
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

		const { user, account, session, verification } = options
		return Object.fromEntries(
			Object.entries({ user, account, session, verification })
				.filter(([_k, v]) => typeof v !== 'undefined')
		) satisfies BetterAuthOptions
	}

	return {
		source: configFile,
		options: configFile ? await loadConfigFile(configFile) : defaultOpts,
	}
}

const generateCmd = defineCommand({
	meta: {
		name: "generate",
		description: "Generate Remult ORM entities for better-auth",
	},
	args: {
		config: {
			type: "string",
			description: "Path to better-auth configuration",
			required: true,
		},
		output: {
			type: "string",
			description: "Path to output file",
			default: "./auth-schema.ts",
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
		description: "Cli to generate Remult ORM entities for better-auth",
	},
	subCommands: {
		generate: generateCmd,
	},
})

runMain(main)
