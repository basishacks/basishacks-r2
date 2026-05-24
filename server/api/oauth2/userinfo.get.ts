import { jwtVerify } from 'jose'
import { getUser } from '~~/server/utils/database/users'

/**
 * OAuth2 UserInfo Endpoint
 *
 * Returns standardized user claims based on the scopes granted in the access token.
 * Requires Authorization: Bearer <access_token> header.
 *
 * Claims returned:
 * - sub (always)
 * - name, picture (if 'profile' scope granted)
 * - email, email_verified (if 'email' scope granted)
 */
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Missing or invalid Authorization header'
    })
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Empty access token'
    })
  }

  const secret = process.env.NUXT_OAUTH2_JWT_SECRET
  if (!secret) {
    throw createError({
      statusCode: 500,
      message: 'NUXT_OAUTH2_JWT_SECRET is not set'
    })
  }

  let payload: any
  try {
    const { payload: verified } = await jwtVerify(token, new TextEncoder().encode(secret))
    payload = verified
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Invalid or expired access token'
    })
  }

  const userId = Number(payload.user_id ?? payload.sub)
  if (!userId || Number.isNaN(userId)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Token missing user identification'
    })
  }

  const user = await getUser(event, userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const scope = (payload.scope as string) || ''
  const scopes = scope.split(' ').filter(Boolean)

  const claims: Record<string, any> = {
    sub: String(user.id),
  }

  if (scopes.includes('profile')) {
    claims.name = user.name
    claims.picture = user.profile_picture
  }

  if (scopes.includes('email')) {
    claims.email = user.email
    claims.email_verified = true
  }

  return claims
})
