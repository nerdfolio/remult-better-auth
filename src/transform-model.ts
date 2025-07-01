import type { BetterAuthOptions } from "better-auth"
import type { BetterAuthDbSchema } from "better-auth/db"
import { remultIdField, transformField } from "./transform-field"
import { modelNameToClassName, modelNameToPlural, trimLines } from "./utils"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>

export function transformSchema(tables: BetterAuthDbSchema, options: BetterAuthOptions = {}) {
	return trimLines(`
	import { Allow, Entity, Fields, Relations, remult, Validators } from 'remult'

	export const Role_Auth = {
		Role_Auth__Admin: 'Role_Auth__Admin',
	} as const

	{{ENTITIES}}

	export const authEntities = {
		${Object.values(tables).map(({ modelName }) => `  ${modelNameToClassName(modelName)},`).join("\n")}
	};
	`).replace("{{ENTITIES}}",
		Object.values(tables).map(({ modelName, fields }) => transformModel({
			modelName,
			fields,
			useNumberId: options.advanced?.database?.useNumberId
		})).join("\n\n\n"))
}

function transformModel({ modelName, fields, useNumberId }: ModelSchema & { useNumberId?: boolean }) {
	const className = modelNameToClassName(modelName)
	const entity = trimLines(`
	@Entity<${className}>('${modelNameToPlural(modelName)}', {
		allowApiCrud: Role_Auth.Role_Auth__Admin,${modelName === "user" ? `
	allowApiRead: Allow.authenticated,
	allowApiUpdate: (item)=>{ return item?.id=== remult.user?.id },
	apiPrefilter: ()=>{
		if(!remult.user?.id){
			throw new Error("User not authenticated")
		}
		return { id: remult.user?.id }
	}`: ``}
	})
	export class ${className} {
		{{FIELDS}}
	}
	`)

	// some custom field definition (such as those in better-auth's additionalFields)
	// may not have fieldName explicitly defined. When that is the case, we ensure there
	// is a fieldName by using the field key.
	const transformedFields = Object.entries(fields)
		.map(([key, { fieldName, ...attrs }]) => ({ fieldName: fieldName ?? key, ...attrs })) // ensure there is a fieldName (some plugins don't define fully)
		.map((f) => transformField(modelName, f))
	const allFields = [remultIdField({ useNumberId })].concat(transformedFields)

	return entity.replace("{{FIELDS}}", trimLines(allFields.join("\n\n"), true))
}

// function generateEntityProps(modelName: string) {
// 	//
// 	// NOTE: remult does not have a way for us to specify onDelete behavior at the 1-to-many declaration.
// 	// So we hard code the known 'cascade' relationships here. Ideally, this declaration should be trigger
// 	// at the field level wheverver 'onDelete' is defined, and should be a database-level foreign-key
// 	// constraint for SQL databases. But this work around should be good enough since user-deletion
// 	// isn't a frequent operation
// 	//
// 	// NOTE: looks like remult already cascade by default
// 	return modelName === "user" ? trimLines(`{
// 		__deleted: async (_deletedUser) => {
// 			____await Promise.all([
// 				______repo(${modelNameToClassName("account")}).deleteMany({ where: { userId: _deletedUser.id } }),
// 				______repo(${modelNameToClassName("session")}).deleteMany({ where: { userId: _deletedUser.id } })
// 			____])
// 		__}
// 	}`).replaceAll('__', "  ") : "{}"
// }
