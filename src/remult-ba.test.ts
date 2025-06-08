import { runAdapterTest } from "better-auth/adapters/test"
import { type ClassType, Remult } from "remult"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, describe } from "vitest"
import * as authEntities from "../db/auth-schema"
import { remultAdapter } from "./remult-ba"

function initRemultForTest(entities: Record<string, ClassType<unknown>>) {
	const remult = new Remult(new JsonFileDataProvider("./zztemp"))

	return {
		remult,
		testEntities: entities,
		cleanup: async () => {
			for (const entityClass of Object.values(entities)) {
				await remult.repo(entityClass).deleteMany({ where: { id: { $ne: null } } })
			}
		},
	}
}

describe("remult-better-auth adapter tests", async () => {
	const { remult, testEntities, cleanup } = initRemultForTest(authEntities)

	afterAll(async () => {
		// Run DB cleanup here...
		await cleanup()
	})
	const adapter = remultAdapter(remult, {
		authEntities: testEntities,
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
