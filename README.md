# remult-better-auth
[better-auth](https://www.better-auth.com) adapter for [remult ORM](https://remult.dev)

## Installation

```console

pnpm i @nerdfolio/remult-better-auth

```

## Generate Schema

This package comes with a minimalist CLI to generate the relevant `better-auth` schema as `remult` entities:
`User, Account, Session, Verification`. After the installation, run:

```console

pnpm @nerdfolio/remult-better-auth generate [output-file]

```

If `output-file` is not provided, the default value is `./auth-schema.ts`


## Usage

Follow the Remult setup to define the api for your particular web framework. For example, in SolidStart, it would be something
like

```typescript
// src/api.ts

export const api = remultApi({
	entities: [...],
	getUser,
	...
})
```

Then use the `getRemult()` method of that api to obtain the remult object and pass that to `@nerdfolio/remult-better-auth`.
You'll need to import the entity schema generated above.

```typescript
import { betterAuth } from "better-auth"
import { api } from "~/api"
import {User, Account, Session, Verification} from "./src/auth-schema"


return betterAuth({
	database: remultAdapter(api.getRemult(), { authEntities: {User, Account, Session, Verification}}),
	...anyOtherBetterAuthOptions
})
```

The alternative to using `api.getRemult()` is instantiating your own `new Remult(...)` instance and setup appropriate
data providers so that the adapter can map better-auth requests to the appropriate entity repositories. You'll probably choose
this for the scripting scenario outside of web frameworks.