import {Entity, Fields, Relations, Validators} from 'remult'

@Entity('user', {})
export class User {
  @Fields.cuid({required: true})
  id = ''

  @Fields.string({required: true})
  name = ''

  @Fields.string({required: true, validate: [Validators.unique(), Validators.email()]})
  email = ''

  @Fields.boolean({required: true})
  emailVerified = false

  @Fields.string({required: false})
  image = ''

  @Fields.createdAt({required: true})
  createdAt = new Date()

  @Fields.updatedAt({required: true})
  updatedAt = new Date()
}


@Entity('session', {})
export class Session {
  @Fields.cuid({required: true})
  id = ''

  @Fields.date({required: true})
  expiresAt = new Date()

  @Fields.string({required: true, validate: [Validators.unique()]})
  token = ''

  @Fields.createdAt({required: true})
  createdAt = new Date()

  @Fields.updatedAt({required: true})
  updatedAt = new Date()

  @Fields.string({required: false})
  ipAddress = ''

  @Fields.string({required: false})
  userAgent = ''

  @Fields.string({required: true})
  userId = ''
  @Relations.toOne<Session, User>(() => User, "id")
  user : User
}


@Entity('account', {})
export class Account {
  @Fields.cuid({required: true})
  id = ''

  @Fields.string({required: true})
  accountId = ''

  @Fields.string({required: true})
  providerId = ''

  @Fields.string({required: true})
  userId = ''
  @Relations.toOne<Account, User>(() => User, "id")
  user : User

  @Fields.string({required: false})
  accessToken = ''

  @Fields.string({required: false})
  refreshToken = ''

  @Fields.string({required: false})
  idToken = ''

  @Fields.date({required: false})
  accessTokenExpiresAt = new Date()

  @Fields.date({required: false})
  refreshTokenExpiresAt = new Date()

  @Fields.string({required: false})
  scope = ''

  @Fields.string({required: false})
  password = ''

  @Fields.createdAt({required: true})
  createdAt = new Date()

  @Fields.updatedAt({required: true})
  updatedAt = new Date()
}


@Entity('verification', {})
export class Verification {
  @Fields.cuid({required: true})
  id = ''

  @Fields.string({required: true})
  identifier = ''

  @Fields.string({required: true})
  value = ''

  @Fields.date({required: true})
  expiresAt = new Date()

  @Fields.createdAt({required: false})
  createdAt = new Date()

  @Fields.updatedAt({required: false})
  updatedAt = new Date()
}