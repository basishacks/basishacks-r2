import type { H3Event, EventHandler } from 'h3'
import { jwtVerify } from 'jose'
import { getUser } from './database/users'

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------

function getJWTSecret(): Uint8Array {
  const secret = process.env.NUXT_OAUTH2_JWT_SECRET
  if (!secret) {
    throw createError({
      statusCode: 500,
      message: 'NUXT_OAUTH2_JWT_SECRET is not set',
    })
  }
  return new TextEncoder().encode(secret)
}

// ------------------------------------------------------------------
// Low-level: verify a raw JWT string
// ------------------------------------------------------------------

export interface OAuth2JWTPayload {
  sub?: string
  user_id?: number
  client_id?: string
  redirect_uri?: string
  scope?: string
  [key: string]: any
}

/**
 * Verify a raw JWT access token and return its payload.
 * Throws 401 errors for invalid or expired tokens.
 */
export async function verifyAccessToken(token: string): Promise<OAuth2JWTPayload> {
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Empty access token',
    })
  }

  try {
    const { payload } = await jwtVerify(token, getJWTSecret(), {
      issuer: 'basishacks',
    })
    return payload as OAuth2JWTPayload
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Invalid or expired access token',
    })
  }
}

// ------------------------------------------------------------------
// Mid-level: extract Bearer token from H3 event
// ------------------------------------------------------------------

/**
 * Extract the Bearer token from the Authorization header.
 * Throws 401 if the header is missing or malformed.
 */
export function extractBearerToken(event: H3Event): string {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Missing or invalid Authorization header',
    })
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Empty access token',
    })
  }

  return token
}

// ------------------------------------------------------------------
// Mid-level: verify JWT from H3 event
// ------------------------------------------------------------------

/**
 * Extract and verify the Bearer token from an H3 event.
 * Returns the decoded JWT payload.
 */
export async function verifyOAuth2JWT(event: H3Event): Promise<OAuth2JWTPayload> {
  const token = extractBearerToken(event)
  return await verifyAccessToken(token)
}

// ------------------------------------------------------------------
// Scope helpers
// ------------------------------------------------------------------

/**
 * Parse a space-separated scope string into an array.
 */
export function parseJWScopes(scope: unknown): string[] {
  if (typeof scope !== 'string') return []
  return scope.split(' ').filter(Boolean)
}

/**
 * Check if the given scopes include every required scope.
 */
export function requireScopes(
  grantedScopes: string[],
  requiredScopes: string[]
): void {
  const missing = requiredScopes.filter((s) => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'insufficient_scope',
      message: `Missing required scope(s): ${missing.join(', ')}`,
    })
  }
}

// ------------------------------------------------------------------
// User helper
// ------------------------------------------------------------------

/**
 * Resolve user_id from a JWT payload, then fetch the user from the DB.
 * Throws 401 if the payload has no valid user id, 404 if user not found.
 */
export async function resolveOAuth2User(event: H3Event, payload: OAuth2JWTPayload) {
  const userId = Number(payload.user_id ?? payload.sub)
  if (!userId || Number.isNaN(userId)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_token',
      message: 'Token missing user identification',
    })
  }

  const user = await getUser(event, userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  return user
}

// ------------------------------------------------------------------
// High-level: wrapper options
// ------------------------------------------------------------------

export interface OAuth2JWTWrapperOptions {
  /**
   * List of scopes that the token must have.
   * If empty, no scope check is performed.
   */
  requiredScopes?: string[]

  /**
   * Whether to load the user from the database and attach it to event.context.
   * Default: false
   */
  loadUser?: boolean
}

export interface OAuth2JWTContext {
  payload: OAuth2JWTPayload
  scopes: string[]
  user?: User
}

// ------------------------------------------------------------------
// High-level: H3 event handler wrapper
// ------------------------------------------------------------------

/**
 * Wrap an API handler so that it requires a valid OAuth2 JWT Bearer token.
 *
 * Options:
 *   - requiredScopes: scopes the token must include
 *   - loadUser: fetch the DB user and attach to event.context.oauth2.user
 *
 * The wrapped handler can read `event.context.oauth2` for the payload, scopes,
 * and (optionally) the user row.
 *
 * Example:
 *   export default withOAuth2JWT(async (event) => {
 *     const { payload, scopes, user } = event.context.oauth2
 *     return { sub: user.id }
 *   }, { requiredScopes: ['profile'], loadUser: true })
 */
export function withOAuth2JWT(
  handler: (event: H3Event) => any,
  options: OAuth2JWTWrapperOptions = {}
): EventHandler {
  return async (event) => {
    const payload = await verifyOAuth2JWT(event)
    const scopes = parseJWScopes(payload.scope)

    if (options.requiredScopes && options.requiredScopes.length > 0) {
      requireScopes(scopes, options.requiredScopes)
    }

    const ctx: OAuth2JWTContext = { payload, scopes }

    if (options.loadUser) {
      ctx.user = await resolveOAuth2User(event, payload)
    }

    // @ts-ignore extend context dynamically
    event.context.oauth2 = ctx

    return await handler(event)
  }
}
