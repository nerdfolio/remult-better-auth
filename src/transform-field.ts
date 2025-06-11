import type { FieldAttribute, FieldType } from "better-auth/db"
import { modelNameToClassName } from "./utils"

export function remultIdField({ name = "id", useNumberId = false }: { name?: string; useNumberId?: boolean }) {
	if (useNumberId) {
		// NOTE: sqlite says "autoincrement" adds unnecessary overhead (https://www.sqlite.org/autoinc.html)
		// however we have to use it here because remult does not give us access to "primary key" constraint
		//
		return `@Fields.autoIncrement({required: true, dbReadOnly: true})
		${name} = 0`.trim()
	}

	return `@Fields.cuid({required: true, dbReadOnly: true})
		${name} = ''`.trim()
}

export function transformField<T extends FieldType>(modelName: string, {
	fieldName,
	type,
	required,
	unique,
	references,
	defaultValue
}: FieldAttribute<T>) {
	let field = ""
	const props = transformFieldProps({
		required,
		unique,
		email: type === "string" && fieldName === "email" ? true : undefined,
		defaultValue
	})

	switch (type) {
		case "string":
			field = `@Fields.string(${props})
			${fieldName} = ''
			`
			break
		case "string[]":
			field = `@Fields.json(${props})
			${fieldName} : string[] = []
			`
			break
		case "number":
			field = `@Fields.integer(${props})
			${fieldName} : number
			`
			break
		case "number[]":
			field = `@Fields.json(${props})
			${fieldName} : number[] = []
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
			throw new Error(`Unimplemented field type: ${JSON.stringify({ modelName, fieldName, type, defaultValue })}`)
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
				case "defaultValue":
					// remult defaultValue is a function so transform if needed
					return typeof v === "function"
						? `${k}: ${v.toString().replace(/\/\*.*\*\//, "")}`
						: `${k}: () => ${v}`
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
