import { randomBytes } from 'node:crypto'
import { LoginRequest } from '~~/shared/schemas'
import { completeAuthorizeSession, getAuthorizeSession } from '../oauth2/session.post'

export default defineEventHandler(async (event) => {

  const { email, code, token } = await readValidatedBody(event, LoginRequest.parse)

  const session = getAuthorizeSession(token)
  console.log("[Authorize -> Login] Requested Login Submit: T:" + token.substring(0, 16) + "...")

  if (!session) {
    throw createError({
      status: 400,
      message: "session_expired"
    })
  }

  const user = await getUserByCode(event, email, code.join(''))
  if (!user) {
    throw createError({
      status: 400,  
      message: 'The given email & code combination is incorrect',
    })
  }

  await setUserSession(event, {
    user: { id: user.id }
  })
  /* If you look carefully, the first hand app on this website is technically a dummy login. :)
    as a result even a code is generated, basishacks doesnt need to redeem it.
    HOWEVER, for external apps, this code will be used to grant an access token for operations.
  */
  completeAuthorizeSession(token)

  return {
    user,
    code: randomBytes(128).toString("base64url"),
    time: Date.now()
  }
})
