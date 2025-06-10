# remult-better-auth
Better Auth adapter for Remult ORM

## Installation

```console

pnpm i @nerdfolio/remult-better-auth

```

## Generate Schema

This package comes with a minimalist CLI that would generate the relevant better-auth schema as Remult entities:
`User, Account, Session, Verification`. After you've installed this package, run this command

```console

pnpm @nerdfolio/remult-better-auth generate [output-file]

```

If `output-file` is not provided, the default value is `./auth-schema.ts`


## Usage

Follow the Remult setup to define the api for your particular web framework. For example, in SolidStart, it is something
like

```typescript
// src/api.ts

export const api = remultApi({
	entities: [...],
	controllers: [TasksController],
	getUser,
	...
})
```

Then use the `getRemult()` method on that api to obtain the remult object and pass that to `@nerdfolio/remult-better-auth`.
You'll need to import the entity schema generated above.

```typescript
import { betterAuth } from "better-auth"
import { api } from "~/api
import {User, Account, Session, Verification} from "./src/auth-schema"


return betterAuth({
	database: remultAdapter(api.getRemult(), { authEntities: {User, Account, Session, Verification}}),
	...otherBetterAuthOptions
})
```

The alternative to using `api.getRemult()` is instantiating your own `new Remult(...)` instance and setup appropriate
data providers so that the adapter can map better-auth requests to the appropriate entity repositories.