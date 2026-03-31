import type { CleanedWhere } from "better-auth/adapters"
import { RemultBetterAuthError } from "./utils"

export function transformWhereClause(where: CleanedWhere[] = []) {
	const conditions = {
		and: [] as [string, unknown][],
		or: [] as [string, unknown][]
	}

	where.forEach(w => {
		if (w.connector === "OR") {
			conditions.or.push(transformWhereOp(w))
		} else {
			conditions.and.push(transformWhereOp(w))
		}
	})

	const whereClause = Object.fromEntries(conditions.or.length ? [["$or", conditions.or.map((cond) => ({ [cond[0]]: cond[1] }))]] : conditions.and as [string, unknown][])
	console.warn("transformWhereClause", where, "whereClause", whereClause)
	return whereClause

	// const entries = where.map((w) => {
	// 	if (w.connector === "AND") {
	// 		return transformWhereOp(w)
	// 	}

	// 	if (w.connector === "OR") {
	// 		// This situation does not show up in adapter tests. Just log it if it comes up to see
	// 		// realistic data points
	// 		//console.warn("OR", w)
	// 		const [opKey, opValue] = transformWhereOp(w)
	// 		const convertedW = ["$or", [{ [opKey]: opValue }]]
	// 		//console.warn("transformWhereClause", where, "w", w, "convertedW", convertedW)
	// 		return convertedW
	// 	}

	// 	if (w.operator) {
	// 		// This situation does not show up in adapter tests. Just log it if it comes up to see
	// 		// realistic data points
	// 		console.warn("Where with op only", w)
	// 		return transformWhereOp(w)
	// 	}

	// 	throw new RemultBetterAuthError(`Unimplemented scenario for where clause: ${JSON.stringify(w)}`)
	// })
	//
	// const whereClause = Object.fromEntries(entries as [string, unknown][])
	// console.warn("transformWhereClause", where, "whereClause", whereClause)
	// return whereClause
}

function transformWhereOp({
	operator,
	value,
	field,
}: CleanedWhere): [string, typeof value | { [key: string]: typeof value }] {
	const op = operator === "starts_with" ? "startsWith" : operator === "ends_with" ? "endsWith" : operator === "not_in" ? "nin" : operator

	switch (op) {
		case "eq":
			return [field, value]
		case "ne":
		case "lt":
		case "lte":
		case "gt":
		case "gte":
		case "in":
		case "nin":
		case "contains":
		case "startsWith":
		case "endsWith":
			// $ne, $lt, $lte, $gt, $gte, $in, $contains, $startsWith, $endsWith
			return [field, { [`$${op}`]: value }]
		default:
			throw new RemultBetterAuthError(`Unknown operator in where clause from better-auth: ${JSON.stringify({ operator, value, field })}`)
	}
}
