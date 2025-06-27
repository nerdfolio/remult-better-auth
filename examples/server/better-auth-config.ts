import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"

export const auth = betterAuth({
	// incomplete example used only to test generate schema
	user: {
		fields: {
			email: "email_address",
		},
	},
	database: memoryAdapter({}) //just to make better-auth happy. Not needed for schema gen
})