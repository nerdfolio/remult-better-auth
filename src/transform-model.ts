import type { BetterAuthDbSchema, FieldType } from "better-auth/db"
import { type CustomFieldAttribute, DEFAULT_ID_FIELD, transformField } from "./transform-field"
import { modelNameToClassName, trimLines } from "./utils"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>

export function generateSchemaCode(tables: BetterAuthDbSchema) {
	return trimLines(`
	import {Entity, Fields, Relations, Validators, repo} from 'remult'

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

	// TODO: we may need to use defaultModelName here instead of modelName in case user has a custom mapping
	// NOTE: better-auth has a cascade delete on foreign key from session-to-user and account-to-user.
	// Ideally we should declare that foreign key constraint where the relation is actually defined.
	// However, remult does not support this (prob due to needing to support non-sql databases).
	// So we handle that here and just hardcode the models. Shouldn't be an issue since we're dealing
	// with 3 known tables.

	const entityProps =
		modelName === "user" ? trimLines(`{
		__deleted: async (_deletedUser) => {
			____await Promise.all([
				______repo(Account).deleteMany({ where: { userId: _deletedUser.id } }),
				______repo(Session).deleteMany({ where: { userId: _deletedUser.id } })
			____])
		__}
	}`).replaceAll('__', "  ") : "{}"

	const entity = trimLines(`
	@Entity<${className}>('${modelName}', {{ENTITY_PROPS}})
	export class ${className} {
		{{FIELDS}}
	}
	`)

	return entity
		.replace("{{ENTITY_PROPS}}", entityProps)
		.replace(
			"{{FIELDS}}",
			trimLines(fieldList.map((f) => transformField({ ...f, modelName })).join("\n\n"), true)
		)
}
