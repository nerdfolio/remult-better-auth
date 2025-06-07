import { runAdapterTest } from "better-auth/adapters/test"
import { JsonDataProvider, Remult } from "remult"
import { JsonEntityFileStorage } from "remult/server"
import { afterAll, describe } from "vitest"
import * as authSchema from "./auth-schema"
import { remultAdapter } from "./remult-ba"

describe("remult-better-auth adapter tests", async () => {
	// const _api = remultApi({
	// 	//entities: [Task],
	// 	//controllers: [TasksController],
	// 	//dataProvider: devCreateD1DataProviderWithLocalBinding("DB"),
	// })

	const serverRemult = new Remult()
	serverRemult.dataProvider = new JsonDataProvider(new JsonEntityFileStorage("./db"))

	afterAll(async () => {
		// Run DB cleanup here...
	})
	const adapter = remultAdapter(serverRemult, {
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
		testPrefix: "create",
	})
})
