import { writeFile } from "node:fs/promises"
import { setTimeout } from "node:timers/promises"
import type { Adapter, BetterAuthOptions } from "better-auth"
import { remultAdapter } from "./ba-remult"
export async function generateRemultSchema({ options, file }: { options: BetterAuthOptions; file?: string }) {
	const adapter = remultAdapter({
		authEntities: {},
	})(options)

	await generateSchema({ adapter, options, file })
}

async function generateSchema({
	adapter,
	options,
	file,
}: { adapter: Adapter; options: BetterAuthOptions; file?: string }) {
	if (!adapter.createSchema) {
		throw new Error(`Adapter "${adapter.id}" does not support createSchema`)
	}

	const { code, path, overwrite } = await adapter.createSchema(options, file)

	const setup = overwrite
		? {
			content: code,
			flag: "w+",
		}
		: {
			content: `\n${code}`,
			flag: "a",
		}

	await writeFile(path, setup.content, { encoding: "utf-8", flag: setup.flag })
}

async function main() {
	await setTimeout(1) // so that all the node import warnings get printed first

	const [file] = process.argv.slice(2)
	generateRemultSchema({ options: {}, file })
}

main()