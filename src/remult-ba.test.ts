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
import { generateSchemaFile } from "./generate-schema"
import { remultAdapter } from "./remult-ba"

const TEMP_ROOT = os.tmpdir()  // "./zztemp" as const
const TEST_OPTIONS: BetterAuthOptions = {
	user: {
		fields: {
			email: "email_address",
		},
	},
}

describe("remult-better-auth", async () => {
	const schemaFile = await generateSchemaFile({ options: TEST_OPTIONS, file: path.join(TEMP_ROOT, "test-schema.ts") })
	const testEntities: Record<string, ClassType<unknown>> = await import(schemaFile)
	afterAll(async () => {
		rmSync(schemaFile)
	})

	describe("memory db", () => testSuite(testEntities, "memory"))
	describe("json db", () => testSuite(testEntities, "json"))
	describe("sqlite db", () => testSuite(testEntities, "sqlite"))
})

async function testSuite(authEntities: Record<string, ClassType<unknown>>, dbType: "json" | "sqlite" | "memory") {
	const {
		provider,
		cleanup = async () => {
			/*no-op*/
		},
	} = setupDatabaseProvider(dbType)
	const remult = new Remult(provider)

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
			return adapterFn({ ...TEST_OPTIONS, ...customOptions })
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
	const tempDir = path.join(TEMP_ROOT, subdir)
	return {
		tempDir,
		deleteTempDir: async () => rmSync(tempDir, { recursive: true }),
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
