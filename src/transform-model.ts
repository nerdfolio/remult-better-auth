import type { BetterAuthDbSchema } from "better-auth/db"
import { remultIdField, transformField } from "./transform-field"
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

	const className = modelNameToClassName(modelName)
	const entity = trimLines(`
	@Entity<${className}>('${modelName}', {})
	export class ${className} {
		{{FIELDS}}
	}
	`)

	const transformedFields = Object.values(fields).map((f) => transformField(modelName, f))
	const allFields = [remultIdField({ type: "cuid" })].concat(transformedFields)

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
