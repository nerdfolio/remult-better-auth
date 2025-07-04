import { Allow, Entity, Fields, Relations, Validators } from 'remult'

const Roles = { admin: "admin" }

@Entity<User>('user', {
	allowApiRead: Allow.authenticated,
	allowApiUpdate: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.id && ent?.id === remult?.user?.id), // admin or owner
	allowApiDelete: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.id && ent?.id === remult?.user?.id), // admin or owner
	allowApiInsert: (_ent, remult) => remult?.isAllowed(Roles.admin) || !remult?.user, // admin or new user
})
export class User {
	@Fields.string({ required: true, minLength: 8, maxLength: 40, validate: Validators.unique(), allowApiUpdate: false })
	id!: string

	@Fields.string({ required: true })
	name = ''

	@Fields.string({ required: true, validate: Validators.unique() })
	email_address = ''

	@Fields.boolean({ required: true, defaultValue: () => false })
	emailVerified = false

	@Fields.string({ required: false })
	image = ''

	@Fields.createdAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date

	@Fields.updatedAt({ required: true, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}


@Entity<Session>('session', {
	allowApiRead: Allow.authenticated,
	allowApiUpdate: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiDelete: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiInsert: (_ent, remult) => remult?.isAllowed(Roles.admin) || !remult?.user, // admin or new user
})
export class Session {
	@Fields.string({ required: true, minLength: 8, maxLength: 40, validate: Validators.unique(), allowApiUpdate: false })
	id!: string

	@Fields.date({ required: true })
	expiresAt = new Date()

	@Fields.string({ required: true, validate: Validators.unique() })
	token = ''

	@Fields.createdAt({ required: true, allowApiUpdate: false })
	createdAt!: Date

	@Fields.updatedAt({ required: true, allowApiUpdate: false })
	updatedAt!: Date

	@Fields.string({ required: false })
	ipAddress = ''

	@Fields.string({ required: false })
	userAgent = ''

	@Fields.string({ required: true })
	userId = ''
	@Relations.toOne<Session, User>(() => User, "id")
	user!: User
}


@Entity<Account>('account', {
	allowApiRead: Allow.authenticated,
	allowApiUpdate: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiDelete: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiInsert: (_ent, remult) => remult?.isAllowed(Roles.admin) || !remult?.user, // admin or new user
})
export class Account {
	@Fields.string({ required: true, minLength: 8, maxLength: 40, validate: Validators.unique(), allowApiUpdate: false })
	id!: string

	@Fields.string({ required: true })
	accountId = ''

	@Fields.string({ required: true })
	providerId = ''

	@Fields.string({ required: true })
	userId = ''
	@Relations.toOne<Account, User>(() => User, "id")
	user!: User

	@Fields.string({ required: false })
	accessToken = ''

	@Fields.string({ required: false })
	refreshToken = ''

	@Fields.string({ required: false })
	idToken = ''

	@Fields.date({ required: false })
	accessTokenExpiresAt = new Date()

	@Fields.date({ required: false })
	refreshTokenExpiresAt = new Date()

	@Fields.string({ required: false })
	scope = ''

	@Fields.string({ required: false })
	password = ''

	@Fields.createdAt({ required: true, allowApiUpdate: false })
	createdAt!: Date

	@Fields.updatedAt({ required: true, allowApiUpdate: false })
	updatedAt!: Date
}


@Entity<Verification>('verification', {
	allowApiRead: Allow.authenticated,
	allowApiUpdate: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiDelete: (ent, remult) => remult?.isAllowed(Roles.admin) || (!!ent?.userId && ent?.userId === remult?.user?.id), // admin or owner
	allowApiInsert: (_ent, remult) => remult?.isAllowed(Roles.admin) || !remult?.user, // admin or new user
})
export class Verification {
	@Fields.string({ required: true, minLength: 8, maxLength: 40, validate: Validators.unique(), allowApiUpdate: false })
	id!: string

	@Fields.string({ required: true })
	identifier = ''

	@Fields.string({ required: true })
	value = ''

	@Fields.date({ required: true })
	expiresAt = new Date()

	@Fields.createdAt({ required: false, defaultValue: () => new Date(), allowApiUpdate: false })
	createdAt!: Date

	@Fields.updatedAt({ required: false, defaultValue: () => new Date(), allowApiUpdate: false })
	updatedAt!: Date
}