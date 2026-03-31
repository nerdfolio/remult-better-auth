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

	if (conditions.or.length && conditions.and.length) {
		// The assumption here is that better-auth's usage of remult is simple.
		// As of better-auth v1.4.19 that is true. Prob will remain true from the type definition of CleanedWhere.
		// Throwing an error here to alert us just in case
		throw new RemultBetterAuthError("Mixed AND/OR conditions in where clause from better-auth is not supported")
	}

	return Object.fromEntries(conditions.or.length ? [["$or", conditions.or.map((cond) => ({ [cond[0]]: cond[1] }))]] : conditions.and as [string, unknown][])
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
