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

You may notice that this mimicks `@better-auth/cli`. Our custom cli is necessary because (as of June 12, 2025), @better-auth/cli
does not use the `createSchema` function from custom adapters. It only supports built-in generators for kysely, drizzle, and prisma.

Here is [a generated schema example](examples/generated-schema.ts)

## Usage

Follow the Remult setup to define the api for your particular web framework. For example, in SolidStart, it would be something
like

```typescript
// src/api.ts

import { auth } from "./auth"

export const api = remultApi({
	entities: [...],
	dataProvider: ...,
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

Then pass either the remult instance or its dataProvider to `@nerdfolio/remult-better-auth`. They can be obtained
via `await api.getRemult()` or `(await api.getRemult()).dataProvider`.

```typescript
import { betterAuth } from "better-auth"
import { api } from "~/api"
import { User, Account, Session, Verification } from "./src/auth-schema" // generated via the cli

return betterAuth({
	database: remultAdapter(await api.getRemult(), { authEntities: {User, Account, Session, Verification}}),
	...anyOtherBetterAuthOptions
})
```

Note: if you define `getUser` using `auth` as above and are annoyed with the compile-time circular dependency between api.ts and auth.ts,
you can define the dataProvider in a separate file and use it separately to define api and auth.

For the scripting scenario, you'll just need to ass the dataProvider.
