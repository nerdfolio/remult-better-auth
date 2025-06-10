import { existsSync, mkdirSync, rmSync } from "node:fs"
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

const TEST_OPTIONS: BetterAuthOptions = {
	user: {
		fields: {
			email: "email_address",
		},
	},
}

type TestDatabaseProvider = JsonFileDataProvider | SqlDatabase | InMemoryDataProvider

describe("remult-better-auth", async () => {
	const testDir = path.join("./zztemp", "remult-better-auth-test")
	if (!existsSync(testDir)) {
		mkdirSync(testDir, { recursive: true })
	}

	const schemaFile = await generateSchemaFile({ options: TEST_OPTIONS, file: path.join(testDir, "test-schema.ts") })
	const testEntities: Record<string, ClassType<unknown>> = await import(schemaFile)

	afterAll(async () => {
		rmSync(testDir, { recursive: true })
	})

	describe("memory db", () => testSuite(testEntities, initDatabaseProvider("memory", "")))
	describe("json db", () => testSuite(testEntities, initDatabaseProvider("json", testDir)))
	describe("sqlite db", () => testSuite(testEntities, initDatabaseProvider("sqlite", testDir)))
})

async function testSuite(authEntities: Record<string, ClassType<unknown>>, dbProvider: TestDatabaseProvider) {
	const remult = new Remult(dbProvider)

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

function initDatabaseProvider(
	type: "json" | "sqlite" | "memory", testDir: string
): TestDatabaseProvider {
	switch (type) {
		case "json":
			return new JsonFileDataProvider(testDir)
		case "sqlite":
			return new SqlDatabase(
				new TursoDataProvider(
					createClient({
						url: `file:${path.join(testDir, "test-db.sqlite")}`,
					})
				)
			)
		default:
			return new InMemoryDataProvider()
	}
}