import type { FieldAttribute, FieldType } from "better-auth/db"
import { modelNameToClassName } from "./utils"

export type CustomFieldAttribute<T extends FieldType> = FieldAttribute<T> & { modelName: string; __cuid?: boolean }
export const DEFAULT_ID_FIELD = {
	type: "string",
	fieldName: "id",
	required: true,
	__cuid: true,
} as CustomFieldAttribute<FieldType>

export function transformField<T extends FieldType>({
	modelName,
	fieldName,
	type,
	required,
	unique,
	references,
	__cuid,
}: CustomFieldAttribute<T>) {
	let field = ""
	const props = transformFieldProps({
		required,
		unique,
		email: type === "string" && fieldName === "email" ? true : undefined,
	})

	if (fieldName?.startsWith("email")) {
		console.log("FIELD:", fieldName, "type", type)
	}

	switch (type) {
		case "string":
			if (__cuid) {
				field = `@Fields.cuid(${props})
				${fieldName} = ''
				`
			} else {
				field = `@Fields.string(${props})
			${fieldName} = ''
			`
			}
			break
		case "number":
			field = `@Fields.integer(${props})
			${fieldName} : number
			`
			break
		case "boolean":
			field = `@Fields.boolean(${props})
			${fieldName} = false
			`
			break
		case "date":
			if (fieldName === "createdAt") {
				field = `@Fields.createdAt(${props})
				${fieldName} = new Date()
				`
			} else if (fieldName === "updatedAt") {
				field = `@Fields.updatedAt(${props})
				${fieldName} = new Date()
				`
			} else {
				field = `@Fields.date(${props})
			  ${fieldName} = new Date()
			  `
			}
			break
		default:
			throw new Error(`Unimplemented field type: [${type}]`)
	}

	//
	// append relation definition
	//
	if (references) {
		if (references.model !== "user") {
			throw new Error(`Unknown references: ${JSON.stringify(references)}`)
		}

		const fromClass = modelNameToClassName(modelName)
		const toClass = modelNameToClassName(references.model)
		field = `${field.trim()}
		@Relations.toOne<${fromClass}, ${toClass}>(() => ${toClass}, "${references.field}")
		${fieldName?.endsWith("Id") ? `${fieldName.slice(0, -2)} : ${toClass}` : ""}
		`
	}

	return field.trim()
}

function transformFieldProps(props: Record<string, unknown>) {
	const validators: string[] = []

	const fieldProps = Object.entries(props)
		.filter(([_k, v]) => typeof v !== "undefined")
		.map(([k, v]) => {
			switch (k) {
				case "unique":
					validators.push("Validators.unique()")
					return null
				case "email":
					validators.push("Validators.email()")
					return null
				default:
					return typeof v !== "undefined" ? `${k}: ${v}` : ""
			}
		})
		.concat([
			validators.length === 0
				? null
				: validators.length === 1
					? `validate: ${validators[0]}`
					: `validate: [${validators.join(", ")}]`,
		])
		.filter((s) => !!s)
		.join(", ")

	return Object.keys(fieldProps).length > 0 ? `{${fieldProps}}` : ""
}
