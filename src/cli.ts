#!/usr/bin/env node
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
	run: async ({ args: { config, output } }) => {
		console.log("config", config)
		return generateRemultSchema({ options: {}, file: output })
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