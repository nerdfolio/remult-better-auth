# remult-better-auth

Adapter to use [better-auth](https://www.better-auth.com) with [remult](https://remult.dev)

## Installation

```sh

pnpm add @nerdfolio/remult-better-auth

# or

npm i @nerdfolio/remult-better-auth


```

## Usage

### Generate the Auth Entities (schema)

```sh

pnpx @better-auth/cli@latest generate

# or

npx @better-auth/cli@latest generate
```

Options:

`--config` - The path to your Better Auth config file. By default, the CLI will search for an `auth.ts` file in `./, ./utils, ./lib`, or any of these directories under `src` directory.

`--output` - The schema output file

See [Better Auth CLI docs](https://www.better-auth.com/docs/concepts/cli) for more CLI usage details and defaults.

Here is [a generated schema example](examples/generated-schema.ts)


### Initialize The Remult API

Follow the Remult setup to define the api for your particular web framework. For example, in SolidStart, it would be something
like

```ts
// src/api.ts

import { auth } from "./auth"

export const api = remultApi({
	entities: [...],
	dataProvider: ...,
	async getUser({request}) {
		const s = await auth.api.getSession({
			headers: request.headers
		})

		if (!s) {
			throw new BetterAuthError(
				"getUserInfo: No session found in request.",
				JSON.stringify(request)
			)
		}

		const { id = "", name = "" } = s ? s.user : {}
		const roles = "role" in s.user
			? (s.user.role as string).split(",").map((r) => r.trim())
			: []satisfies string[]

		return { id, name, roles } satisfies UserInfo
	},
	...
})
```

### Initialize Better-Auth with This Adapter

Then pass the remult instance or its dataProvider or a promise to either to `@nerdfolio/remult-better-auth`. These values can be obtained
via `api.getRemult()` or `(await api.getRemult()).dataProvider`.

```ts
import { betterAuth } from "better-auth"
import { api } from "~/api"
import { User, Account, Session, Verification } from "./src/auth-schema" // generated via the cli

return betterAuth({
	database: remultAdapter(api.getRemult(), {
		authEntities: {User, Account, Session, Verification}
	}),
	...anyOtherBetterAuthOptions
})
```

> [!TIP]
> If you define `getUser` using `auth` as above and are annoyed with the compile-time circular dependency between `api.ts` and `auth.ts`,
you can define the dataProvider in a separate file and use it separately to define api and auth.
>
> For the scripting scenario, you'll just need to ass the dataProvider.
