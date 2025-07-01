import { betterAuth } from "better-auth"
import { remultAdapter } from "../../src"
import { remult } from "remult"

export const auth = betterAuth({
	database: remultAdapter(remult, {
		authEntities: {},
	})
})