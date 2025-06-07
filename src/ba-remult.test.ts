import { runAdapterTest } from "better-auth/adapters/test"
import { InMemoryDataProvider, Remult } from "remult"
import { afterAll, describe } from "vitest"
import * as authSchema from "./auth-schema"
import { remultAdapter } from "./ba-remult"

describe("remult-better-auth adapter tests", async () => {
	// const _api = remultApi({
	// 	//entities: [Task],
	// 	//controllers: [TasksController],
	// 	//dataProvider: devCreateD1DataProviderWithLocalBinding("DB"),
	// })

	const serverRemult = new Remult()
	serverRemult.dataProvider = new InMemoryDataProvider()

	afterAll(async () => {
		// Run DB cleanup here...
	})
	const adapter = remultAdapter({
		authEntities: authSchema,
		debugLogs: {
			// If your adapter config allows passing in debug logs, then pass this here.
			isRunningAdapterTests: true, // This is our super secret flag to let us know to only log debug logs if a test fails.
		},
	})

	await runAdapterTest({
		getAdapter: async (betterAuthOptions = {}) => {
			return adapter(betterAuthOptions)
		},
	})
})
