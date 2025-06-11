import type { FieldAttribute, FieldType } from "better-auth/db"
import { modelNameToClassName } from "./utils"

export function remultIdField({ name = "id", useNumberId = false }: { name?: string; useNumberId?: boolean }) {
	if (useNumberId) {
		// NOTE: sqlite says "autoincrement" adds unnecessary overhead (https://www.sqlite.org/autoinc.html)
		// however we have to use it here because remult does not give us access to "primary key" constraint
		//
		return `@Fields.autoIncrement({required: true, allowNull: false, allowApiUpdate: false})
		${name}! : number`.trim()
	}

	// better-auth handles id generation for us and pass it to create() so string type suffices. No need for cuid().
	return `@Fields.string({required: true, minLength: 8, maxLength: 40, validate: Validators.unique(), allowNull: false, allowApiUpdate: false})
		${name}! : string`.trim()
}

export function transformField<T extends FieldType>(modelName: string, {
	fieldName,
	type,
	required,
	unique,
	references,
	defaultValue
}: FieldAttribute<T>) {
	function isNullable() {
		if ((type === "string" && fieldName === "email")
			|| (type === "date" && ["createdAt", "updatedAt"].includes(fieldName ?? ""))
			|| (type === "boolean")
		) return false

		return undefined
	}

	const props = Object.fromEntries(Object.entries({
		required,
		unique,
		defaultValue,
		email: type === "string" && fieldName === "email" ? true : undefined,
		allowNull: isNullable(),
		allowApiUpdate: type === "date" && ["createdAt", "updatedAt"].includes(fieldName ?? "") ? true : undefined
		// NOTE: dbReadOnly doesn't seem to work as expected
		//
		// dbReadOnly: type === "date" && ["createdAt", "updatedAt"].includes(fieldName ?? "") ? true : undefined
	}).filter(([_k, v]) => typeof v !== 'undefined'))

	const transformedProps = transformFieldProps(props)

	let field = ""
	switch (type) {
		case "string":
			field = `@Fields.string(${transformedProps})
			${fieldName} = ''
			`
			break
		case "string[]":
			field = `@Fields.json(${transformedProps})
			${fieldName} : string[] = []
			`
			break
		case "number":
			field = `@Fields.integer(${transformedProps})
			${fieldName} : number
			`
			break
		case "number[]":
			field = `@Fields.json(${transformedProps})
			${fieldName} : number[] = []
			`
			break

		case "boolean":
			field = `@Fields.boolean(${transformedProps})
			${fieldName} = false
			`
			break
		case "date":
			if (fieldName === "createdAt") {
				field = `@Fields.createdAt(${transformedProps})
				${fieldName}! : Date
				`
			} else if (fieldName === "updatedAt") {
				field = `@Fields.updatedAt(${transformedProps})
				${fieldName}! : Date
				`
			} else {
				field = `@Fields.date(${transformedProps})
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
		${fieldName?.endsWith("Id") ? `${fieldName.slice(0, -2)}! : ${toClass}` : ""}
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
