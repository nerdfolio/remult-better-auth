import { type AdapterDebugLogs, type CustomAdapter, createAdapter } from "better-auth/adapters"
import { type ClassType, type ErrorInfo, type Remult, SqlDatabase } from "remult"
import { transformSchema } from "./transform-model"
import { transformWhereClause } from "./transform-where"
import { RemultBetterAuthError } from "./utils"

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
			throw new RemultBetterAuthError(
				`Model "${modelName}" not found. Check your "authEntities" in remult-better-auth adapter configuration?`
			)
		}
		return repo
	}

	return createAdapter({
		config: {
			adapterId: "remult",
			adapterName: "Remult BetterAuth Adapter",
			supportsNumericIds: true,
			supportsJSON: true,
			debugLogs: adapterCfg.debugLogs ?? false,
		},
		adapter: ({ options }) => {
			return {
				async createSchema({ file, tables }) {
					return {
						code: transformSchema(tables, options),
						path: file ?? "./auth-schema.ts",
						overwrite: true,
					}
				},
				async create({ model, data: values }) {
					const modelRepo = getRepo(model)
					modelRepo.create()
					return modelRepo.insert(values) as Promise<typeof values>
				},
				async findOne<T>({ model, where }: Parameters<CustomAdapter["findOne"]>[0]) {
					const modelRepo = getRepo(model)
					return modelRepo.findOne({
						where: transformWhereClause(where),
					}) as Promise<T>
				},
				async findMany<T>({ model, where, sortBy, limit, offset }: Parameters<CustomAdapter["findMany"]>[0]) {
					const modelRepo = getRepo(model)
					const transformedWhere = where ? transformWhereClause(where) : undefined
					const orderBy = sortBy ? { [sortBy.field]: sortBy.direction } : undefined

					if (!offset) {
						return modelRepo.find({
							where: transformedWhere,
							orderBy,
							limit,
						}) as Promise<T[]>
					}

					if (!(modelRepo.metadata.options.dataProvider instanceof SqlDatabase)) {
						//
						// For non-sql providers, such as Json file, we have to fallback to grabbing a bigger chunk
						// than required, then slice it to the requested limit
						//
						if (limit > offset) {
							// example: limit 10, offset 3
							// Because repo.find() only give us limit+page, we have to do this lame fallback grab limit+offset
							// and use slice to do the skipping
							const rows = (await modelRepo.find({
								where: transformedWhere,
								orderBy,
								limit: limit + offset,
							})) as T[]

							return rows.slice(offset)
						}

						//
						// limit <= offset or no limit specified
						//
						const rows = (await modelRepo.find({
							where: transformedWhere,
							orderBy,
							limit: offset, // offset acts as pageSize
							page: 1, // then we skip page 0 and slice to get limit
						})) as T[]

						return rows.slice(0, limit)
					}

					//
					// For SQL data providers, we can go drop to sql to use limit/offset
					//
					const command = SqlDatabase.getDb().createCommand()
					const sqlFilter = await SqlDatabase.filterToRaw(modelRepo, transformWhereClause(where), command)

					const sqlOrderBy = sortBy ? `ORDER BY ${sortBy.field} ${sortBy.direction}` : ""
					const sqlLimitOffset = `${limit ? `LIMIT ${limit} ` : ""} ${offset ? `OFFSET ${offset}` : ""}`.trim()

					const dbTable = modelRepo.metadata.dbName
					const result = await command.execute(
						`SELECT * FROM ${dbTable} WHERE ${sqlFilter} ${sqlOrderBy} ${sqlLimitOffset}`.trim()
					)
					return result.rows satisfies T[]
				},
				async count({ model, where }) {
					const modelRepo = getRepo(model)
					return modelRepo.count(transformWhereClause(where))
				},
				async update({ model, where, update: values }) {
					//
					// Sanity check. Shouldn't happen
					//
					if (where.length > 1 || where[0].field !== "id") {
						throw new Error(
							`adapter::update() only supports 1 where clause with id field. Given where clause: ${JSON.stringify(where)}`
						)
					}

					const modelRepo = getRepo(model)
					return modelRepo.update(where[0].value as string | number, values as Record<string, unknown>) as Promise<
						typeof values
					>
				},
				async updateMany({ model, where, update: values }) {
					const modelRepo = getRepo(model)
					return modelRepo.updateMany({
						where: transformWhereClause(where),
						set: values as Record<string, unknown>,
					})
				},
				async delete({ model, where }) {
					//
					// Sanity check. Shouldn't happen
					//
					if (where.length > 1 || where[0].field !== "id") {
						throw new Error(
							`adapter::update() only supports 1 where clause with id field. Given where clause: ${JSON.stringify(where)}`
						)
					}

					const modelRepo = getRepo(model)
					try {
						await modelRepo.delete(where[0].value as string | number)
					} catch (e: unknown) {
						// NOTE: remult should have an explicit error class or error code to make user error handling cleaner
						const { message, httpStatusCode } = e as ErrorInfo
						if (httpStatusCode === 404 || message?.includes("not found")) {
							// absorb this error because better-auth expects deleting non-existing id to not throw
						} else {
							throw e
						}
					}
				},
				async deleteMany({ model, where }) {
					const modelRepo = getRepo(model)
					return modelRepo.deleteMany({ where: transformWhereClause(where) })
				},
				options: adapterCfg,
			}
		},
	})
}
