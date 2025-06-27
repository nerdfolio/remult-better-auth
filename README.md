# remult-better-auth

This adapter allows you to use [better-auth](https://www.better-auth.com) with [remult](https://remult.dev).

## Default usage

```sh
# Install as dev dependencies.
npm add better-auth @nerdfolio/remult-better-auth -D

# run the generate command.
npm run remult-better-auth generate
# It will:
#   - use `/src/modules/auth/server/better-auth-config.ts` or create it and use it. (You can escape this by passing `--config`).
#   - generate entities `/src/modules/auth/entities.ts`. (You can escape this by passing `--output`).
```

## Examples

### `better-auth-config.ts`

_usually in `src/modules/auth/server/better-auth-config.ts`_

```ts
import { betterAuth } from "better-auth";
import { remultAdapter } from "@nerdfolio/remult-better-auth";
import { remult } from "remult";

// TODO: remove `const authEntities = {};` and use the import under.
const authEntities = {};
// import { authEntities } from "../entities";

export default betterAuth({
  database: remultAdapter(remult, {
    authEntities,
  }),
});
```

### `entities.ts`

_usually in `src/modules/auth/entities.ts`_

[Check out the code](examples/entities.ts)

## Using Module

Add your `auth` module to `remultApi`.

```ts
// src/server/api.ts
import { auth } from "$module/auth/server"

export const api = remultApi({
  modules: [auth()],
})
```
Check out all the [examples folder](./examples)

## Manual steps not using remult module

You will need to

1. Add generated `entities` to `remultApi`.
```ts
// src/server/api.ts
import { authEntities } from "PATH/TO/entities.ts"

export const api = remultApi({
  entities: [Object.values(authEntities)],
})
```

2. fill `getUser` method in `remultApi` to teach remult how to get the user from the session.
```ts
// src/server/api.ts
import { authEntities } from "PATH/TO/entities.ts"

export const api = remultApi({
  async getUser({request}) {
    const s = await auth.api.getSession({
      headers: request.headers
    })

    if (!s) return undefined

    return {
      id: s.user.id,
      name: s.user.name,
      roles: [],
    } satisfies UserInfo
})
```
_Other option: You can also fill `remult.user = ...` in `initRequest` of `remultApi`._

3. Add the [better-auth integration](https://www.better-auth.com/docs/integrations/svelte-kit) for your web framework.
