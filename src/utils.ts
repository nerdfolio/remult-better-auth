import { BetterAuthError } from "better-auth"

export class RemultBetterAuthError extends BetterAuthError {
	constructor(message: string, cause?: string) {
		super(message, cause)
		this.name = "RemultBetterAuthError"
	}
}

export function trimLines(str: string, indentYN = false) {
	const indent = indentYN ? "  " : ""
	return str
		.trim()
		.split("\n")
		.map((line) => (line.trim() ? indent + line.trim() : line.trim()))
		.join("\n")
}

export function modelNameToClassName(modelName: string) {
	return modelName.charAt(0).toUpperCase() + modelName.slice(1)
}

export async function writeFile(path: string, content: string, { overwrite = false }: { overwrite?: boolean } = {}) {
	// Ensure all directories exist before writing the file
	await import("node:fs/promises").then(async fs => {
		const idx = path.lastIndexOf("/")
		const dir = idx !== -1 ? path.slice(0, idx) : "."
		await fs.mkdir(dir, { recursive: true })
		await fs.writeFile(path, content, { encoding: "utf-8", flag: overwrite ? "w+" : "a" })
	})
}