import path from "node:path"
import { createClient } from "@libsql/client"
import { runAdapterTest } from "better-auth/adapters/test"
import { type ClassType, Remult, SqlDatabase } from "remult"
import { TursoDataProvider } from "remult/remult-turso"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { remultAdapter } from "./remult-ba"
import * as authEntities from "./schema.example"

function initRemultForTest(entities: Record<string, ClassType<unknown>>, dbType: "json" | "sqlite") {
	async function resetDb() {
		for (const entityClass of Object.values(entities)) {
			await remult.repo(entityClass).deleteMany({ where: { id: { $ne: null } } })
		}
	}

	function initRemult(dbType: "json" | "sqlite"): { remult: Remult; cleanup?: () => Promise<void> } {
		const tempDir = "./zztemp"
		switch (dbType) {
			case "json":
				return { remult: new Remult(new JsonFileDataProvider(tempDir)) }
			default: {
				const db = new SqlDatabase(new TursoDataProvider(
					createClient({
						url: `file:${path.join(tempDir, "test-db.sqlite")}`
					})
				))

				return { remult: new Remult(db) }
			}
		}
	}

	const { remult, cleanup = resetDb } = initRemult(dbType)

	return {
		remult,
		cleanup,
		testEntities: entities,
	}
}

describe("remult-better-auth adapter tests from better-auth", async () => {
	const { remult, testEntities, cleanup } = initRemultForTest(authEntities, "sqlite")

	beforeAll(async () => {
		const metadata = Object.values(testEntities).map((entityClass) => remult.repo(entityClass).metadata)
		if (remult.dataProvider.ensureSchema) {
			await remult.dataProvider.ensureSchema(metadata)
		}
	})

	afterAll(async () => {
		// Run DB cleanup here...
		//await cleanup()
	})

	const adapterFn = remultAdapter(remult, {
		authEntities: testEntities,
		debugLogs: {
			// If your adapter config allows passing in debug logs, then pass this here.
			isRunningAdapterTests: true, // This is our super secret flag to let us know to only log debug logs if a test fails.
		},
	})

	await runAdapterTest({
		getAdapter: async (betterAuthOptions = {}) => {
			return adapterFn(betterAuthOptions)
		},
	})

	test("findMany limit < offset", async () => {
		const res = await adapterFn({}).findMany({ model: "user", offset: 5, limit: 2 })
		expect(res).toHaveLength(2)
	})

	test("findMany limit > offset", async () => {
		const res = await adapterFn({}).findMany({ model: "user", offset: 4, limit: 3 })
		expect(res).toHaveLength(3)
	})

	test("findMany has limit, no offset", async () => {
		const res = await adapterFn({}).findMany({ model: "user", limit: 3 })
		expect(res).toHaveLength(3)
	})

	test("findMany no limit, has offset", async () => {
		const res = await adapterFn({}).findMany({ model: "user", offset: 3 })
		expect(res).toHaveLength(4)
	})
})
