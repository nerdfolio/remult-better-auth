import type { BetterAuthDbSchema, FieldAttribute, FieldType } from "better-auth/db"

type ValueOf<T> = T[keyof T]
type ModelSchema = ValueOf<BetterAuthDbSchema>
type CustomFieldAttribute<T extends FieldType> = FieldAttribute<T> & { modelName: string; __cuid?: boolean }

const DEFAULT_ID_FIELD = { type: "string", fieldName: "id", required: true, __cuid: true } as CustomFieldAttribute<FieldType>

export function genSchemaCode(tables: BetterAuthDbSchema) {
	return trimLines(`
	import {Entity, Fields, Relations, Validators} from 'remult'

	<ENTITIES>
	`).replace("<ENTITIES>", Object.values(tables).map(genEntityClass).join("\n\n\n"))
}

function genEntityClass({ modelName, fields }: ModelSchema) {
	const entity = trimLines(`
	@Entity('${modelName}', {})
	export class ${classNameFromModelName(modelName)} {
		<FIELDS>
	}
	`)

	console.log(modelName, "HAS ID FIELD?", "id" in fields)

	// better-auth schema doesn't seem to have an id field, prepend it so it appears as the first field
	const modelFields = ("id" in fields ? [] : [DEFAULT_ID_FIELD]).concat(
		Object.values(fields) as CustomFieldAttribute<FieldType>[]
	)

	return entity.replace("<FIELDS>", trimLines(modelFields.map((f) => genField({ ...f, modelName })).join("\n\n"), true))
}

function genField<T extends FieldType>({
	modelName,
	fieldName,
	type,
	required,
	unique,
	references,
	__cuid,
}: CustomFieldAttribute<T>) {
	let field = ""
	const props = genFieldProps({
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

		const fromClass = classNameFromModelName(modelName)
		const toClass = classNameFromModelName(references.model)
		field = `${field.trim()}
		@Relations.toOne<${fromClass}, ${toClass}>(() => ${toClass}, "${references.field}")
		${fieldName?.endsWith("Id") ? `${fieldName.slice(0, -2)} : ${toClass}` : ""}
		`
	}

	return field.trim()
}

function genFieldProps(props: Record<string, unknown>) {
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
		.filter((s) => !!s) // remove validator entries
		.concat(validators.length > 0 ? [`validate: [${validators.join(", ")}]`] : [])  // merge validators in to one {validate: []...} entry
		.join(", ")

	return Object.keys(fieldProps).length > 0 ? `{${fieldProps}}` : ""
}

function classNameFromModelName(modelName: string) {
	return modelName.charAt(0).toUpperCase() + modelName.slice(1)
}

function trimLines(str: string, indentYN = false) {
	const indent = indentYN ? "  " : ""
	return str
		.trim()
		.split("\n")
		.map((line) => (line.trim() ? indent + line.trim() : line.trim()))
		.join("\n")
}
