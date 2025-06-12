import { betterAuth } from "better-auth"

export const auth = betterAuth({
	// incomplete example used only to test generate schema
	user: {
		fields: {
			email: "email_address",
		},
	},
})