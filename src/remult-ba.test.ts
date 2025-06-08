import path from "node:path"
import { createClient } from "@libsql/client"
import { runAdapterTest } from "better-auth/adapters/test"
import { type ClassType, Remult, SqlDatabase } from "remult"
import { TursoDataProvider } from "remult/remult-turso"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, describe } from "vitest"
import { remultAdapter } from "./remult-ba"
import * as authEntities from "./schema.example"

function initRemultForTest(entities: Record<string, ClassType<unknown>>, dbType: "json" | "sqlite") {
	let remult: Remult
	const cleanup = async function resetDb() {
		for (const entityClass of Object.values(entities)) {
			await remult.repo(entityClass).deleteMany({ where: { id: { $ne: null } } })
		}
	}

	const tempDir = "./zztemp"
	switch (dbType) {
		case "json":
			remult = new Remult(new JsonFileDataProvider(tempDir))
			break
		default:
			remult = new Remult(new SqlDatabase(
				new TursoDataProvider(
					createClient({
						url: `file:${path.join(tempDir, "test-db.sqlite")}`
					})
				)))
	}

	return {
		remult,
		cleanup,
		testEntities: entities,
	}
}

describe("remult-better-auth adapter tests", async () => {
	const { remult, testEntities, cleanup } = initRemultForTest(authEntities, "json")

	afterAll(async () => {
		// Run DB cleanup here...
		// await cleanup()
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
	})
})
