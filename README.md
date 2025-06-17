# remult-better-auth

Adapter to use [better-auth](https://www.better-auth.com) with [remult ORM](https://remult.dev)

## Installation

```console

pnpm i @nerdfolio/remult-better-auth

```

## Generate Schema

This package comes with a single-command CLI to generate the relevant `better-auth` schema as `remult` entities:
`User, Account, Session, Verification`. After the installation, run:

```console

pnpm remult-better-auth generate --config ./auth.ts --output ./db/auth-schema.ts

```

`--config` is required. It refers to the auth.ts setup file for your project.
If `--output` is not provided, the default value is `./auth-schema.ts`.

You may notice that this mimicks `@better-auth/cli`. Our custom cli is necessary because (as of June 2025), @better-auth/cli
does not use the `createSchema` function from custom adapters. It only supports built-in generators for kysely, drizzle, and prisma.

Here is [a generated schema example](examples/generated-schema.ts)

## Usage

Follow the Remult setup to define the api for your particular web framework. For example, in SolidStart, it would be something
like

```typescript
// src/remult-data-provider.ts

export const remultDataProvider = new JsonFileDataProvider("./db")
```

```typescript
// src/remult-api.ts

import { remultDataProvider } from "./remult-data-provider"
import { auth } from "./auth"

export const api = remultApi({
	entities: [...],
	dataProvider: remultDataProvider,
	async getUser({request}) {
		const s = await auth.api.getSession({ headers: request.headers })

		if (!s) {
			throw new BetterAuthError("getUserInfo: No session found in request.", JSON.stringify(request))
		}

		const { id = "", name = "" } = s ? s.user : {}
		const roles = "role" in s.user ? (s.user.role as string).split(",").map((r) => r.trim()) : [] satisfies string[]

		return { id, name, roles } satisfies UserInfo
	},
	...
})
```

Then pass the same dataProvider instance to  `@nerdfolio/remult-better-auth`. It's preferable to use the shared
dataProvider instance. Alternatively, you can also use `(await api.getRemult()).dataProvider` but `getUser()` is defined
using `auth` then you'll have an annoying compile-time circular dependency.

```typescript
import { betterAuth } from "better-auth"
import { api } from "~/api"
import { User, Account, Session, Verification } from "./src/auth-schema" // generated via the cli
import { remultDataProvider } from "./remult-data-provider"


return betterAuth({
	database: remultAdapter(remultDataProvider, { authEntities: {User, Account, Session, Verification}}),
	...anyOtherBetterAuthOptions
})
```

The alternative to using `api.getRemult()` is instantiating your own `new Remult(...)` instance and setup appropriate
data providers so that the adapter can map better-auth requests to the appropriate entity repositories. You'll probably choose
this for the scripting scenario outside of web frameworks.
