import { isPromise } from "node:util/types"
import { type AdapterDebugLogs, type CleanedWhere, type CustomAdapter, createAdapter } from "better-auth/adapters"
import { type ClassType, type DataProvider, type ErrorInfo, Remult, type Repository, SqlDatabase } from "remult"
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

/**
 * Create a BetterAuth adapter for Remult.
 *
 * @param remultOrDataProvider - instance of DataProvider or Remult
 * @param adapterCfg - configuration for the adapter
 * @returns a BetterAuth adapter creating function, e.g. (options: BetterAuthOptions) => Adapter
 *
 */
export function remultAdapter(remultOrDataProvider: DataProvider | Remult | Promise<Remult | DataProvider>, adapterCfg: RemultAdapterOptions) {

	type IdType = string | number
	let remult: Remult
	let authRepos: Record<string, Repository<unknown>>

	async function getRepo(modelName: string) {
		if (!remult) {
			const resolved = isPromise(remultOrDataProvider) ? await remultOrDataProvider : remultOrDataProvider
			// remult = resolved instanceof Remult ? resolved : new Remult(resolved)
			// NOTE: the instanceof check above is not reliable. When esm code is mixed with cjs during bundling
			// that check returns false even though resolved was obtained via api.getRemult() thus is a Remult instance.
			// We work around it with check for the dataProvider member
			remult = 'dataProvider' in resolved ? resolved : new Remult(resolved)
		}

		if (!authRepos) {
			authRepos = Object.fromEntries(
				Object.values(adapterCfg.authEntities)
					.map((entityClass) => remult.repo(entityClass))
					.map((repo) => [repo.metadata.key, repo])
			)
		}
		const repo = authRepos[modelName]
		if (!repo) {
			throw new RemultBetterAuthError(
				`Model "${modelName}" not found. Check your "authEntities" in remult-better-auth configuration.`
			)
		}
		return repo
	}

	async function findIdWhere(modelRepo: Repository<unknown>, where: CleanedWhere[]) {
		const { id } = ((await modelRepo.findOne({ where: transformWhereClause(where) })) as { id?: IdType }) ?? {}
		return id
	}

	return createAdapter({
		config: {
			adapterId: "remult",
			adapterName: "Remult BetterAuth Adapter",
			supportsNumericIds: true,
			supportsJSON: true,
			debugLogs: adapterCfg.debugLogs ?? false,
			usePlural: true,
		},
		adapter: ({ options, debugLog }) => {
			return {
				async createSchema({ file, tables }) {
					debugLog("createSchema", { file, tables })
					return {
						code: transformSchema(tables, options),
						path: file ?? "./auth-schema.ts",
						overwrite: true,
					}
				},
				async create({ model, data }) {
					debugLog("create", { model, data })
					// NOTE: better-auth already generates an id for us. It's in data.
					// NOTE: for some reason, remult doesn't persist on "save" but does on "insert"
					return getRepo(model).then(repo => repo.insert(data) as Promise<typeof data>)
				},
				async findOne<T>({ model, where }: Parameters<CustomAdapter["findOne"]>[0]) {
					debugLog("findOne", { model, where })
					return getRepo(model).then(repo => repo.findOne({
						where: transformWhereClause(where),
					}) as Promise<T>)
				},
				async findMany<T>({ model, where, sortBy, limit, offset }: Parameters<CustomAdapter["findMany"]>[0]) {
					debugLog("findMany", { model, where, sortBy, limit, offset })
					const modelRepo = await getRepo(model)
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
					debugLog("count", { model, where })
					return getRepo(model).then(repo => repo.count(transformWhereClause(where)))
				},
				async update({ model, where, update: values }) {
					debugLog("update", { model, where, values })
					//
					// Sanity check. Shouldn't happen
					//)
					if (where.length > 1) {
						throw new RemultBetterAuthError(
							`adapter::update() only supports 1 where clause. Given where clause: ${JSON.stringify(where)}`
						)
					}

					const modelRepo = await getRepo(model)

					//
					// When where isn't conditioned on "id", it's most likely a session update conditioned on "token".
					// We have to get an id first because remult needs the id for update to return the updated object.
					// updateMany() doesn't work for this case because it returns the number of rows updated
					//
					const modelId = where[0].field === "id" ? (where[0].value as IdType) : await findIdWhere(modelRepo, where)

					if (!modelId) {
						throw new RemultBetterAuthError(`adapter::update() couldn't find "${model}" where ${JSON.stringify(where)}`)
					}

					return modelRepo.update(modelId, values as Record<string, unknown>) as Promise<typeof values>
				},
				async updateMany({ model, where, update: values }) {
					debugLog("updateMany", { model, where, values })
					return getRepo(model).then(repo => repo.updateMany({
						where: transformWhereClause(where),
						set: values as Record<string, unknown>,
					}))
				},
				async delete({ model, where }) {
					debugLog("delete", { model, where })
					//
					// Sanity check. Shouldn't happen
					//
					if (where.length > 1) {
						throw new RemultBetterAuthError(
							`adapter::delete() only supports 1 where. Given where clause: ${JSON.stringify(where)}`
						)
					}

					//
					// When where isn't conditioned on "id", it's most likely a session update conditioned on "token".
					// We have to get an id first because remult needs the id for update to return the updated object.
					// deleteMany() doesn't work for this case because it returns the number of rows updated
					//
					const modelRepo = await getRepo(model)
					const modelId = where[0].field === "id" ? (where[0].value as IdType) : await findIdWhere(modelRepo, where)

					if (!modelId) {
						throw new RemultBetterAuthError(`adapter::delete() couldn't find "${model}" where ${JSON.stringify(where)}`)
					}

					try {
						await modelRepo.delete(modelId)
					} catch (e: unknown) {
						// NOTE: remult doesn't have explicit error class or error code so we gotta do this manually
						const { message, httpStatusCode } = e as ErrorInfo
						if (httpStatusCode === 404 || message?.includes("not found")) {
							// absorb this error because better-auth expects deleting non-existing id to not throw
						} else {
							throw e
						}
					}
				},
				async deleteMany({ model, where }) {
					debugLog("deleteMany", { model, where })
					return getRepo(model).then(repo => repo.deleteMany({ where: transformWhereClause(where) }))
				},
				options: adapterCfg,
			}
		},
	})
}
