import { existsSync, mkdirSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { createClient } from "@libsql/client"
import type { BetterAuthOptions } from "better-auth"
import { runAdapterTest } from "better-auth/adapters/test"
import { type ClassType, InMemoryDataProvider, Remult, SqlDatabase } from "remult"
import { TursoDataProvider } from "remult/remult-turso"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { remultAdapter } from "./remult-ba"
import * as authEntities from "./schema.example"

describe("remult-better-auth", async () => {
	describe("memory db", () => testSuite("memory"))
	describe("json db", () => testSuite("json"))
	describe("sqlite db", () => testSuite("sqlite"))
})

async function testSuite(dbType: "json" | "sqlite" | "memory") {
	const {
		provider,
		cleanup = async () => {
			/*no-op*/
		},
	} = setupDatabaseProvider(dbType)
	const remult = new Remult(provider)

	const testOptions: BetterAuthOptions = {
		user: {
			fields: {
				email: "email_address",
			},
		},
	}

	const adapterFn = remultAdapter(remult, {
		authEntities,
		debugLogs: {
			// If your adapter config allows passing in debug logs, then pass this here.
			isRunningAdapterTests: true, // This is our super secret flag to let us know to only log debug logs if a test fails.
		},
	})

	beforeAll(async () => {
		const metadata = Object.values(authEntities).map(
			(entityClass: ClassType<unknown>) => remult.repo(entityClass).metadata
		)
		if (remult.dataProvider.ensureSchema) {
			await remult.dataProvider.ensureSchema(metadata)
		}
	})

	afterAll(async () => {
		await cleanup()
	})

	await runAdapterTest({
		getAdapter: async (customOptions = {}) => {
			return adapterFn({ ...testOptions, ...customOptions })
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
}

function useTempDir(subdir: string) {
	const tempDir = path.join(os.tmpdir(), subdir)
	return {
		tempDir,
		deleteTempDir: async () => {
			console.log("deleting---------------------", tempDir)
			// try {
			// 	rmSync(tempDir, { recursive: true })
			// } catch (e:) {

			// }
			rmSync(tempDir, { recursive: true })
		},
	}
}

function setupDatabaseProvider(type: "json" | "sqlite" | "memory"): {
	provider: JsonFileDataProvider | SqlDatabase | InMemoryDataProvider
	cleanup?: () => Promise<void>
} {
	const { tempDir, deleteTempDir } = useTempDir(`remult-better-auth-test-${type}`)

	switch (type) {
		case "json":
			return {
				provider: new JsonFileDataProvider(tempDir),
				cleanup: deleteTempDir,
			}
		case "sqlite": {
			if (!existsSync(tempDir)) {
				mkdirSync(tempDir)
			}
			return {
				provider: new SqlDatabase(
					new TursoDataProvider(
						createClient({
							url: `file:${path.join(tempDir, "test-db.sqlite")}`,
						})
					)
				),
				cleanup: deleteTempDir,
			}
		}

		default:
			return {
				provider: new InMemoryDataProvider(),
			}
	}
}
