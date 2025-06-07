import { BetterAuthError } from "better-auth"
import type { CleanedWhere } from "better-auth/adapters"

export function convertWhereClause(where: CleanedWhere[] = []) {
	// BetterAuth type CleanedWhere = {
	// 	operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "contains" | "starts_with" | "ends_with"
	// 	value: string | number | boolean | string[] | number[] | Date | null
	// 	field: string
	// 	connector: "AND" | "OR"
	// }

	console.log("where clause", where)

	const entries = where.map((w) => {
		// if (w.connector === "AND") {
		// 	const [opKey, opValue] = convertWhereOp(w)
		// 	return ["$and", { [opKey]: opValue }]
		// }
		if (w.connector === "AND") {
			console.log("AND", w)
			return convertWhereOp(w)
		}

		if (w.connector === "OR") {
			console.log("OR", w)
			const [opKey, opValue] = convertWhereOp(w)
			return ["$or", { [opKey]: opValue }]
		}

		if (w.operator) {
			console.log("Where with op only", w)
			return convertWhereOp(w)
		}
	})

	return Object.fromEntries(entries as [string, unknown][])
}

function convertWhereOp({
	operator,
	value,
	field,
}: CleanedWhere): [string, typeof value | { [key: string]: typeof value }] {
	const op = operator === "starts_with" ? "startsWith" : operator === "ends_with" ? "endsWith" : operator

	switch (op) {
		case "eq":
			return [field, value]
		case "ne":
		case "lt":
		case "lte":
		case "gt":
		case "gte":
		case "in":
		case "contains":
			// $ne, $lt, $lte, $gt, $gte, $in, $contains, $startsWith, $endsWith
			return [field, { [`$${operator}`]: value }]
		default:
			throw new BetterAuthError(`Unknown operator in where clause: ${JSON.stringify({ operator, value, field })}`)
	}
}