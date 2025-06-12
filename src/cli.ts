#!/usr/bin/env node
import { loadConfig } from "c12"
import { defineCommand, runMain } from "citty"
import { generateRemultSchema } from "./remult-generate-schema"

const generateCmd = defineCommand({
	meta: {
		name: "generate",
		description: "Generate Remult ORM entities for better-auth",
	},
	args: {
		config: {
			type: "string",
			description: "Path to better-auth configuration."
		},
		output: {
			type: "string",
			description: "Path to output file",
			default: "./auth-schema.ts"
		}
	},
	run: async ({ args: { config: configFile, output } }) => {
		console.log("Loading better-auth options from:", configFile)
		const { config: { auth: { options } } } = await loadConfig({ configFile })

		console.log("Generating schema based on better-auth options", options)
		return generateRemultSchema({ options, file: output })
	}
})

const main = defineCommand({
	meta: {
		name: "remult-better-auth",
		version: "_",
		description: "Cli to generate Remult ORM entities for better-auth"
	},
	subCommands: {
		generate: generateCmd
	}
})

runMain(main)