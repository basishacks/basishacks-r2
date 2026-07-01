import { randomBytes } from 'node:crypto'
import { LoginRequest } from '~~/shared/schemas'
import { completeAuthorizeSession, generateExchangeCode, getAuthorizeSession } from '../oauth2/session.post'
import { determinePostMicrosoft, usedSensitiveScopes } from '~~/server/utils/oauth2-validate'

async function handler(event: any) {

  const { email, code } = await readValidatedBody(event, LoginRequest.parse)

  const token = getCookie(event, "bridge_id")

  if (!token) {
    throw createError({
      status: 400,
      message: "Cookie 'bridge_id' is required"
    })
  }

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
  
  const apiuser = await getUser(event ,user.id)

  const sensitive = usedSensitiveScopes(session)

  return {
      user: apiuser,
      sensitive,
      time: Date.now()
    }

  
}

export default applyRateLimit(handler, {
  maxRequests: 5,
  windowMs: 60_000,
  keyPrefix: 'auth:login',
  keyGenerator: async (event) => {
    try {
      const body = await readBody(event)
      const email = (body as any)?.email
      if (typeof email === 'string') {
        return `email:${email.toLowerCase().trim()}`
      }
    } catch {
      // ignore and fall back to IP
    }
    return null
  },
})
