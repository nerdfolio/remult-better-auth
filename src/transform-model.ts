import type { BetterAuthDbSchema, FieldType } from "better-auth/db"
import { type CustomFieldAttribute, DEFAULT_ID_FIELD, transformField } from "./transform-field"
import { modelNameToClassName, trimLines } from "./utils"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>

export function transformSchema(tables: BetterAuthDbSchema) {
	return trimLines(`
	import {Entity, Fields, Relations, Validators} from 'remult'

	{{ENTITIES}}
	`).replace("{{ENTITIES}}", Object.values(tables).map(transformModel).join("\n\n\n"))
}

function transformModel({ modelName, fields }: ModelSchema) {
	//
	// better-auth schema doesn't seem to have an id field, add it as 1st field
	//
	const prependFields =
		"id" in fields
			? []
			: (() => {
				console.info(`better-auth schema for model "${modelName}" does not specify an "id" field. Prepending one.`)
				return [DEFAULT_ID_FIELD]
			})()
	const fieldList = prependFields.concat(Object.values(fields) as CustomFieldAttribute<FieldType>[])

	const className = modelNameToClassName(modelName)


	const entity = trimLines(`
	@Entity<${className}>('${modelName}', {})
	export class ${className} {
		{{FIELDS}}
	}
	`)

	return entity.replace(
		"{{FIELDS}}",
		trimLines(fieldList.map((f) => transformField({ ...f, modelName })).join("\n\n"), true)
	)
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