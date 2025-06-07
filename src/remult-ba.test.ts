import { runAdapterTest } from "better-auth/adapters/test"
import { Remult } from "remult"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, describe } from "vitest"
import * as authSchema from "../db/auth-schema"
import { remultAdapter } from "./remult-ba"

describe("remult-better-auth adapter tests", async () => {
	// const _api = remultApi({
	// 	//entities: [Task],
	// 	//controllers: [TasksController],
	// 	//dataProvider: devCreateD1DataProviderWithLocalBinding("DB"),
	// })

	// FIXME: why is there no JSON file in the ./db directory?
	const remult = new Remult(new JsonFileDataProvider("./db"))
	// serverRemult.dataProvider = new JsonDataProvider(new JsonEntityFileStorage("./db"))

	const user = remult.repo(authSchema.User).create({ name: "foo", email: "barrr@example.com" })
	console.log("------------user-------------", user)

	afterAll(async () => {
		// Run DB cleanup here...
	})
	const adapter = remultAdapter(remult, {
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
