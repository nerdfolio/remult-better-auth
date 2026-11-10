import { existsSync, mkdirSync, rmSync } from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { type ClassType, type DataProvider, InMemoryDataProvider, Remult, SqlDatabase } from "remult"
import { TursoDataProvider } from "remult/remult-turso"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { generateRemultSchema } from "./dev-generate-schema"
import { remultAdapter } from "./remult-ba"

const TEST_OPTIONS = {
	secret: "test-secret-that-is-long-enough-for-better-auth",
	baseURL: "http://localhost:3000",
	user: {
		fields: {
			email: "email_address",
		},
	},
	emailAndPassword: { enabled: true },
} satisfies BetterAuthOptions

describe("remult-better-auth", async () => {
	const testDir = path.join("./zztemp", "remult-better-auth-test")
	if (existsSync(testDir)) {
		rmSync(testDir, { recursive: true })
	}
	mkdirSync(testDir, { recursive: true })

	const schemaFile = await generateRemultSchema({
		options: TEST_OPTIONS,
		file: path.join(testDir, "test-schema.ts"),
	})
	const schemaFilePlural = await generateRemultSchema({
		options: TEST_OPTIONS,
		file: path.join(testDir, "test-schema-plural.ts"),
		adapterOptions: { usePlural: true },
	})

	const testEntities: Record<string, ClassType<unknown>> = await import(path.resolve(schemaFile))
	const testEntitiesPlural: Record<string, ClassType<unknown>> = await import(path.resolve(schemaFilePlural))

	afterAll(async () => {
		rmSync(testDir, { recursive: true })
	})

	describe("memory db", () => testSuite(testEntities, initDatabaseProvider("memory", "")))
	describe("json db", () => testSuite(testEntities, initDatabaseProvider("json", testDir)))
	describe("sqlite db", () => testSuite(testEntities, initDatabaseProvider("sqlite", testDir)))
	describe("memory db - usePlural", () => testSuite(testEntitiesPlural, initDatabaseProvider("memory", ""), true))
})

async function testSuite(
	authEntities: Record<string, ClassType<unknown>>,
	dataProvider: DataProvider,
	usePlural = false
) {
	const remult = new Remult(dataProvider)
	const adapterFn = remultAdapter({ authEntities, usePlural, dataProvider })
	const adapter = adapterFn(TEST_OPTIONS)

	beforeAll(async () => {
		const metadata = Object.values(authEntities).map((entityClass) => remult.repo(entityClass).metadata)
		await remult.dataProvider.ensureSchema?.(metadata)
		for (let i = 0; i < 10; i++) {
			await adapter.create({
				model: "user",
				data: { name: `user ${i}`, email: `user${i}@test.com`, emailVerified: false },
			})
		}
	})

	test("findMany limit < offset", async () => {
		const res = await adapter.findMany({ model: "user", offset: 5, limit: 2 })
		expect(res).toHaveLength(2)
	})

	test("findMany limit > offset", async () => {
		const res = await adapter.findMany({ model: "user", offset: 4, limit: 3 })
		expect(res).toHaveLength(3)
	})

	test("findMany has limit, no offset", async () => {
		const res = await adapter.findMany({ model: "user", limit: 3 })
		expect(res).toHaveLength(3)
	})

	test("findMany no limit, has offset", async () => {
		const resNoOffset = await adapter.findMany({ model: "user" })
		const resWithOffset = await adapter.findMany({ model: "user", offset: 3 })
		expect(resWithOffset).toHaveLength(resNoOffset.length - 3)
	})

	test("consumeOne deletes and returns the row once", async () => {
		const identifier = `consume-${crypto.randomUUID()}`
		await adapter.create({
			model: "verification",
			data: { identifier, value: "v", expiresAt: new Date(Date.now() + 60_000) },
		})
		const where = [{ field: "identifier", value: identifier }]

		const first = await adapter.consumeOne<{ identifier: string }>({ model: "verification", where })
		expect(first?.identifier).toBe(identifier)
		expect(await adapter.findOne({ model: "verification", where })).toBeNull()
		expect(await adapter.consumeOne({ model: "verification", where })).toBeNull()
	})

	test("password reset consumes the token", async () => {
		let resetToken = ""
		const auth = betterAuth({
			...TEST_OPTIONS,
			database: adapterFn,
			emailAndPassword: {
				enabled: true,
				sendResetPassword: async ({ token }) => {
					resetToken = token
				},
			},
		})
		const email = `reset-${crypto.randomUUID()}@test.com`
		await auth.api.signUpEmail({ body: { email, password: "old-password", name: "reset" } })
		await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset" } })
		expect(resetToken).not.toBe("")

		const res = await auth.api.resetPassword({ body: { token: resetToken, newPassword: "new-password" } })
		expect(res.status).toBe(true)
		await expect(
			auth.api.resetPassword({ body: { token: resetToken, newPassword: "other-password" } })
		).rejects.toThrow()

		const signIn = await auth.api.signInEmail({ body: { email, password: "new-password" } })
		expect(signIn.user.email).toBe(email)
	})
}

function initDatabaseProvider(type: "json" | "sqlite" | "memory", testDir: string): DataProvider {
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
