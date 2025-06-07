import { Remult } from "remult"
import { User } from "../db/auth-schema"
import { JsonFileDataProvider } from "remult/server"

// FIXME: why is there no JSON file in the ./db directory?
const remult = new Remult(new JsonFileDataProvider("./db"))
// serverRemult.dataProvider = new JsonDataProvider(new JsonEntityFileStorage("./db"))

const user = remult.repo(User).create({ name: "foo", email: "barrr@example.com" })

console.log("user created", user)