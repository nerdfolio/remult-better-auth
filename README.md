# remult-better-auth

This adapter allows you to use [better-auth](https://www.better-auth.com) with [remult](https://remult.dev).

## Get started

1. Install all the dependencies.
```sh
# Install as dev dependencies.
pnpm add better-auth @nerdfolio/remult-better-auth -D
```

2. Create a config file that will hold your `better-auth` config.

That's the default one, it will be improved later.

_Note: you can put it at the root of your project, or you will have to specify the path to it when running the cli. `--config`_

```ts
// auth.ts
import { betterAuth } from "better-auth"
import { remultAdapter } from "@nerdfolio/remult-better-auth"
import { remult } from "remult"

export const auth = betterAuth({
	database: remultAdapter(remult, {
		authEntities: {},
	})
})
```

3. Run the cli to generate the auth entities.

_Note: you can specify the output path with `--output ./path/to/authEntities.ts`_

```sh
# generate the auth entities
pnpx @better-auth/cli@latest generate
```

4. Update `auth.ts` to use the generated auth entities.

```ts
// auth.ts
import { betterAuth } from "better-auth"
import { remultAdapter } from "@nerdfolio/remult-better-auth"
import { remult } from "remult"
import { authEntities } from "./authEntities"

export const auth = betterAuth({
	database: remultAdapter(remult, {
		authEntities,
	})
})
```
You can add other options following [better-auth basic-usage](https://www.better-auth.com/docs/basic-usage).

5. Setup your `better-auth integration`.

For example, [SvelteKit Integration](https://www.better-auth.com/docs/integrations/svelte-kit), you will find all other integrations beside.

6. Teach `remult` who is the current user for the backend.

One option is to use the `getUser` function of `remultApi` and return the user.

```ts
// src/api.ts

import { auth } from "./auth"
import type { UserInfo } from "remult"

export const api = remultApi({
  async getUser({request}) {
    const s = await auth.api.getSession({
      headers: request.headers
    })

    // No user
    if (!s) return undefined
		// or throw an error
		// if (!s) {
		//  console.error("getRequestUser: No session found in request.", JSON.stringify(request))
		//  throw new BetterAuthError("Unauthorized")
	  // }

		const u: UserInfo = {
			id: s.user.id,
			name: s.user.name
		}

		// add some logic to fill other user props
		// u.roles = s.user.role?.split(",").map((r) => r.trim()) ?? []

    return u
  }
})
```
In this file, you will probably add some logic to define `roles` and other key props.
You can find how to extend `UserInfo` [here](https://remult.dev/docs/custom-options#setting-up-the-types-d-ts-file-for-custom-type-extensions).

7. Teach `remult` who is the current user for the frontend.

For this, you need to set `remult.user` in the frontend.
```ts
// You can use this util function in the frontend
// that will call your backend and set `remult.user` for you.
remult.initUser()

// or, depending on your framework

// you can pass the SSR user to the frontend
// and set `remult.user`
let { data } = // framework SSR data
remult.user = data.user
```

## Advanced

- if you define `getUser` using `auth` as above and are annoyed with the compile-time circular dependency between api.ts and auth.ts,
you can define the dataProvider in a separate file and use it separately to define api and auth.

- `getUser` fonctionality could be done by setting `remult.user` in the `initRequest` hook.

- For the scripting scenario, you'll just need to ass the dataProvider.
