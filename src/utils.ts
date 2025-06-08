import { BetterAuthError } from "better-auth"

export class RemultBetterAuthError extends BetterAuthError {
	constructor(message: string, cause?: string) {
		super(message, cause)
		this.name = "RemultBetterAuthError"
	}
}