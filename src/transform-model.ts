import type { BetterAuthDbSchema, FieldType } from "better-auth/db"
import { type CustomFieldAttribute, DEFAULT_ID_FIELD, transformField } from "./transform-field"
import { modelNameToClassName, trimLines } from "./utils"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>

export function generateSchemaCode(tables: BetterAuthDbSchema) {
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
