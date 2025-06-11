import type { FieldAttribute, FieldType } from "better-auth/db"
import { RemultBetterAuthError, modelNameToClassName } from "./utils"

export function remultIdField({ name = "id", type }: { name?: string; type: "cuid" }) {
	if (type === "cuid") {
		return `@Fields.cuid({required: true, dbReadOnly: true, validate: Validators.unique()})
		${name} = ''
	`.trim()
	}

	throw new RemultBetterAuthError(`id field type [${type}] not supported`)
}

export function transformField<T extends FieldType>(modelName: string, {
	fieldName,
	type,
	required,
	unique,
	references,
	...rest
}: FieldAttribute<T>) {
	let field = ""
	const props = transformFieldProps({
		required,
		unique,
		email: type === "string" && fieldName === "email" ? true : undefined,
	})

	console.log("SUPPORT defaultValue", rest)
	console.log("support numberic id or say not supported in README")
	console.log("NEED TO HANDLE field type string[] and number[]")

	switch (type) {
		case "string":
			field = `@Fields.string(${props})
			${fieldName} = ''
			`
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
