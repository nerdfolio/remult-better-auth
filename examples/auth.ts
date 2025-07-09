import { betterAuth } from "better-auth"
import { InMemoryDataProvider } from "remult"
import { remultAdapter } from "../src"

export const auth = betterAuth({
	// incomplete example used only to test generate schema
	user: {
		fields: {
			email: "email_address",
		},
	},
	database: remultAdapter({
		// no need to declare entities when we're generating them
		authEntities: {},
		usePlural: true
	}),
})
