import type { BetterAuthOptions } from "better-auth"
import type { BetterAuthDbSchema } from "better-auth/db"
import { remultIdField, transformField } from "./transform-field"
import { modelNameToClassName, modelNameToPlural, trimLines } from "./utils"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>

export function transformSchema(tables: BetterAuthDbSchema, options: BetterAuthOptions = {}) {
	return trimLines(`
	import {Allow, Entity, Fields, Relations, Validators} from 'remult'

	const Roles = { admin: "admin" }

	{{ENTITIES}}
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
	@Entity<${className}>('${modelNameToPlural(modelName)}', ${generateEntityProps(modelName)})
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

function generateEntityProps(modelName: string) {
	if(modelName === 'user'){
		return `{
			// admin can do anything
			allowApiCrud: Roles.admin,
			// Any one can read
			allowApiRead: Allow.authenticated
		}`
	}

	return `{
		allowApiCrud: Roles.admin
	}`
}
