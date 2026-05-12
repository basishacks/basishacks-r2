import type { H3Event } from 'h3'

export async function getUser(
  event: H3Event,
  userID: number
): Promise<User | null> {
  let select = event.context.db.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(userID)
    .first() as User | null

    return select?select:null;

    // if (!select) return null
    // if (select.profile_theme instanceof String) {
    //   const profile_theme_mode = select.profile_theme?.split("|")[0]
    //   const profile_theme_value = select.profile_theme?.split("|")[1] 
    //   const parsed = {mode: profile_theme_mode, value: profile_theme_value}
      
    //   const current: any = select;
    //   current.profile_theme = parsed;
    //   return current;
    // } else if (select.profile_theme == null) {
    //   return select;
    // }
}

export async function getUserByEmail(event: H3Event, email: string): Promise<User | null> {
  return event.context.db.prepare(
    'SELECT * FROM users WHERE lower(email) = ?'
  )
    .bind(email.toLowerCase())
    .first() as User | null
}

export async function addCodeToUser(event: H3Event, email: string): Promise<User> {
  const oldUser = await getUserByEmail(event, email)
  if (
    oldUser?.login_expiry &&
    oldUser.login_expiry - 9 * 60 * 1000 > Date.now() &&
    oldUser.role != 'admin' // Admins can request codes more frequently for testing purposes
  ) {

    throw createError({
      status: 403,
      message: 'Please wait 1 minute before requesting another code!',
    })
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = Date.now() + 10 * 60 * 1000

  // upsert user
  const user = (event.context.db.prepare(
    'INSERT INTO users(email, login_code, login_expiry) VALUES(?, ?, ?) ON CONFLICT(email) DO UPDATE SET login_code = EXCLUDED.login_code, login_expiry = EXCLUDED.login_expiry RETURNING *'
  )
    .bind(email.toLowerCase(), code, expiry)
    .first() as User)!

  return user
}

export async function getUserByCode(
  event: H3Event,
  email: string,
  code: string
): Promise<Pick<User, 'id'> | null> {
  return event.context.db.prepare(
    'UPDATE users SET login_code = NULL WHERE lower(email) = ? AND login_code = ? RETURNING id'
  )
    .bind(email.toLowerCase(), code)
    .first() as Pick<User, 'id'> | null
}

export async function updateUserName(event: H3Event, user: User) {
  const result = event.context.db.prepare(
    'UPDATE users SET name = ? WHERE id = ?'
  )
    .bind(user.name, user.id)
    .run()

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}

export async function updateUserProfileTheme(event: H3Event, user: User) {
  const result = event.context.db.prepare(
    'UPDATE users SET profile_theme = ? WHERE id = ?'
  )
    .bind(user.profile_theme, user.id)
    .run()

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
}
