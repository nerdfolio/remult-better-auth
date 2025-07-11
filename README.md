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

See [Better Auth CLI docs](https://www.better-auth.com/docs/concepts/cli) for further explanations.

Here is [a sample output](examples/generated-entities.ts)


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
	database: remultAdapter({
		authEntities: {User, Account, Session, Verification},
		dataProvider: api.getRemult().then(r => r.dataProvider)
	}),
	...anyOtherBetterAuthOptions
})
```

Adapter Options:
- `authEntities`: on initial entity generation, use `{}`. Afterwards, use this to point to your auth entities.
- `debugLogs`: optional, default => false. When true the adapter will output what better-auth passes to it
- `usePlural`: optional. default => false. When true, the generated table names will be pluralized, e.g. `users`, `accounts`
- `dataProvider` optional. Specify an alternate data provider for this adapter. You may also want to pass this from your api definition to ensure the custom data provider is used instead of the default.

> [!NOTE]
> There may be situations where the configuration of better-auth and this adapter runs before your remult api configuration.
In those cases, you'll end up with the default dataProvider instead of the one you intended. Even though `dataProvider` is optional, it's better to pass in the provider you used for your remult api.
