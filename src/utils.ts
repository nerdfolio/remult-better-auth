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

// Let's start very simple.
export function modelNameToPlural(modelName: string) {
	return modelName + "s"
}