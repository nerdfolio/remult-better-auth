import { type AdapterDebugLogs, type CustomAdapter, createAdapter } from "better-auth/adapters"
import type { ClassType, Remult } from "remult"
import { genSchemaCode } from "./gen-schema"
import { convertWhereClause } from "./gen-where-clause"

export interface RemultAdapterOptions {
	authEntities: Record<string, ClassType<unknown>>
	/**
	 * Enable debug logs for the adapter
	 * @default false
	 */
	debugLogs?: AdapterDebugLogs
}

export function remultAdapter(remult: Remult, adapterCfg: RemultAdapterOptions) {
	const authRepos = Object.fromEntries(
		Object.values(adapterCfg.authEntities)
			.map((entityClass) => remult.repo(entityClass))
			.map((repo) => [repo.metadata.key, repo])
	)

	function getRepo(modelName: string) {
		const repo = authRepos[modelName]
		if (!repo) {
			; `The auth model "${modelName}" not found. Is it in the authEntities passed to the remult-better-auth adapter?`
		}
		return repo
	}

	return createAdapter({
		config: {
			adapterId: "remult",
			adapterName: "Remult Adapter",
			debugLogs: adapterCfg.debugLogs ?? false,
		},
		adapter: ({ getFieldName, options, schema }) => {
			console.log("CREATIGN ADAPTER", options, schema)
			return {
				async createSchema({ file, tables }) {
					return {
						code: genSchemaCode(tables),
						path: file ?? "./auth-schema.ts",
						overwrite: true,
					}
				},
				async create({ model, data: values }) {
					const modelRepo = getRepo(model)
					const transformedValues = Object.fromEntries(Object.entries(values)
						.map(([field, v]) => [getFieldName({ model, field }), v]))

					console.log("CREATE...", model, values, transformedValues)
					return modelRepo.insert(values) as Promise<typeof values>
				},
				async findOne<T>({ model, where }: Parameters<CustomAdapter["findOne"]>[0]) {
					//console.log("FIND ONE___", "model", model, "where", where)
					//console.log("FIND ONE___", "converted where:", convertWhereClause(where))
					//debugLog("findOne:::::::::::::", { model, where })
					const modelRepo = getRepo(model)
					return modelRepo.findOne({
						where: convertWhereClause(where),
					}) as Promise<T>
				},
				async findMany<T>({ model, where, sortBy, limit, offset }: Parameters<CustomAdapter["findMany"]>[0]) {
					const modelRepo = getRepo(model)

					// // NOTE: remult repo.find() only accepts limit + page but not arbitrary offset
					// // so we have to do something manual here
					// const command = SqlDatabase.getDb().createCommand()

					// const filterSql = await SqlDatabase.filterToRaw(modelRepo, convertWhereClause(where), command)

					// const orderBy = sortBy ? `ORDER BY ${sortBy.field} ${sortBy.direction}` : ""
					// const limitOffset = `${limit ? `LIMIT ${limit} ` : ""} ${offset ? `OFFSET ${offset}` : ""}`.trim()

					// const dbTable = modelRepo.metadata.dbName
					// const result = await command.execute(
					// 	`SELECT * FROM ${dbTable} WHERE ${filterSql} ${orderBy} ${limitOffset}`.trim()
					// )
					// return result.rows satisfies T[]

					if (!offset) {
						return modelRepo.find({
							where: where ? convertWhereClause(where) : undefined,
							orderBy: sortBy ? { [sortBy.field]: sortBy.direction } : undefined,
							limit,
						}) as Promise<T[]>
					}

					// remult.repo.find() only accepts limit+page but not arbitrary offset.
					// Most of the time, offset is obtained via some pagination mechanism and thus offset = limit * page
					// However, there are cases where that's not true. Here we handle that.
					// Method: use "offset" as a way to skip the first page, then slice the 2nd page to
					// return the requested "limit"
					console.log("FIND MANY", limit, offset)
					if (offset % limit === 0) {
						console.log("FIND MANY limit and offset are compatible", limit, offset)
					} else {
						throw new Error(`FIND MANY limit and offset incompatible: ${limit} -- ${offset}`)
					}
					const pageSize = offset
					const rows = await modelRepo.find({
						where: where ? convertWhereClause(where) : undefined,
						orderBy: sortBy ? { [sortBy.field]: sortBy.direction } : undefined,
						limit: pageSize,
						page: 1 //0-based so this is the second page
					})
					return rows.slice(0, limit) as T[]
				},
				async count({ model, where }) {
					const modelRepo = getRepo(model)
					return modelRepo.count(convertWhereClause(where))
				},
				async update({ model, where, update: values }) {
					const modelRepo = getRepo(model)

					//
					// Sanity check. Shouldn't happen
					//
					if (where.length > 1 || where[0].field !== "id") {
						throw new Error(
							`adapter::update() only supports 1 where clause with id field. Given where clause: ${JSON.stringify(where)}`
						)
					}

					return modelRepo.update(where[0].value as string | number, values as Record<string, unknown>) as Promise<
						typeof values
					>
				},
				async updateMany({ model, where, update: values }) {
					const modelRepo = getRepo(model)
					return modelRepo.updateMany({
						where: convertWhereClause(where),
						set: values as Record<string, unknown>,
					})
				},
				async delete({ model, where }) {
					console.log("DELETE SINGLE", model, where)
					await this.deleteMany({ model, where })
				},
				async deleteMany({ model, where }) {
					const modelRepo = getRepo(model)
					return modelRepo.deleteMany({ where: convertWhereClause(where) })
				},
				options: adapterCfg,
			}
		},
	})
}
