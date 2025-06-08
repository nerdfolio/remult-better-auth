import { runAdapterTest } from "better-auth/adapters/test"
import { type ClassType, Remult } from "remult"
import { JsonFileDataProvider } from "remult/server"
import { afterAll, describe } from "vitest"
import { remultAdapter } from "./remult-ba"
import * as authEntities from "./schema.example"

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
		//await cleanup()
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
		// disableTests: {
		// 	//FIND_MODEL_WITH_MODIFIED_FIELD_NAME: true,
		// },
	})
})

// async function testFindModelWithModifiedFieldName({
// 	getAdapter: Parameters<typeof runAdapterTest>["getAdapter"],
// }) {
// 	const email = "test-email-with-modified-field@email.com";
// 	const adapter = getAdapter

// 			const adapter = await getAdapter(
// 				Object.assign(
// 					{
// 						user: {
// 							fields: {
// 								email: "email_address",
// 							},
// 						},
// 					},
// 					internalOptions?.predefinedOptions,
// 				),
// 			);
// 			const user = await adapter.create({
// 				model: "user",
// 				data: {
// 					email,
// 					name: "test-name-with-modified-field",
// 					emailVerified: true,
// 					createdAt: new Date(),
// 					updatedAt: new Date(),
// 				},
// 			});
// 			expect(user.email).toEqual(email);
// 			const res = await adapter.findOne<User>({
// 				model: "user",
// 				where: [
// 					{
// 						field: "email",
// 						value: email,
// 					},
// 				],
// 			});
// 			expect(res).not.toBeNull();
// 			expect(res?.email).toEqual(email);
// 		},
// }
