import { BetterAuthError } from "better-auth"
import { type AdapterDebugLogs, type CustomAdapter, createAdapter } from "better-auth/adapters"
import { type ClassType, SqlDatabase, repo } from "remult"
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

export function remultAdapter(adapterCfg: RemultAdapterOptions) {
	function getEntityClass(modelName: string) {
		// NOTE: should request the entityInfo_key Symbol be exported by remult
		const keySymbol = Symbol.for("entityInfo_key")
		console.log("adapterCfg", adapterCfg)
		const entityClass = Object.values(adapterCfg.authEntities).find((ent) => ent[keySymbol] === modelName)

		if (!entityClass) {
			throw new BetterAuthError(
				`The model "${modelName}" was not found in the authEntities object. Please pass the authEntities directly to the adapter options.`
			)
		}
		return entityClass
	}

	function getRepo(modelName: string) {
		return repo(getEntityClass(modelName))
	}

	return createAdapter({
		config: {
			adapterId: "remult",
			adapterName: "Remult Adapter",
			debugLogs: adapterCfg.debugLogs ?? false,
		},
		adapter: () => {
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
					const entity = await modelRepo.create(values) as Record<string, unknown>
					return entity.id
				},
				async findOne<T>({ model, where }: Parameters<CustomAdapter["findOne"]>[0]) {
					const modelRepo = getRepo(model)
					return modelRepo.findOne({
						where: convertWhereClause(where),
					}) as Promise<T>
				},
				async findMany<T>({ model, where, sortBy, limit, offset }: Parameters<CustomAdapter["findMany"]>[0]) {
					const modelRepo = getRepo(model)

					// NOTE: remult repo.find() only accepts limit + page but not arbitrary offset
					// so we have to do something manual here
					const command = SqlDatabase.getDb().createCommand()

					const filterSql = await SqlDatabase.filterToRaw(modelRepo, convertWhereClause(where), command)

					const orderBy = sortBy ? `ORDER BY ${sortBy.field} ${sortBy.direction}` : ""
					const limitOffset = `${limit ? `LIMIT ${limit} ` : ""} ${offset ? `OFFSET ${offset}` : ""}`.trim()

					const dbTable = modelRepo.metadata.dbName
					const result = await command.execute(
						`SELECT * FROM ${dbTable} WHERE ${filterSql} ${orderBy} ${limitOffset}`.trim()
					)
					return result.rows satisfies T[]

					// if no offset given, just use the standard implementation
					// return modelRepo.find({
					// 	where: where ? convertWhereClause(where) : undefined,
					// 	orderBy: sortBy ? { [sortBy.field]: sortBy.direction } : undefined,
					// 	limit,
					// })
				},
				async count({ model, where }) {
					const modelRepo = getRepo(model)
					return modelRepo.count(convertWhereClause(where))
				},
				async update({ model, where, update: values }) {
					const modelRepo = getRepo(model)
					console.log("SINGLE UPDATEEEE", model, where, values)
					if (1 === 1) throw new Error("BOOO")
					return modelRepo.update("zzzz", values as Record<string, unknown>) as Promise<typeof values>

					// return modelRepo.updateMany({
					// 	where: convertWhereClause(where),
					// 	set: values as Record<string, unknown>,
					// })
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
