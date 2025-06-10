#!/usr/bin/env node
import { setTimeout } from "node:timers/promises"
import { generateSchemaFile } from "./generate-schema"

async function main() {
	await setTimeout(1) // so that all the node import warnings get printed first

	const defaultFile = "./auth-schema.ts"

	const [command, file = defaultFile] = process.argv.slice(2)
	if (command !== "generate") {
		throw new Error(
			`Unknown command: ${command}. Only "generate out-file" is supported. If out-file is not specified, it defaults to "${defaultFile}"`
		)
	}

	await generateSchemaFile({ options: {}, file })
}

main()
