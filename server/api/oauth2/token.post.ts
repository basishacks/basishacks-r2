import { 
  useAuthCode, 
  createAccessToken, 
  createRefreshToken,
  getRefreshToken
} from '~/../server/utils/oauth2'

/**
 * OAuth2 Token Endpoint
 * Exchange authorization code for access token
 * Or refresh access token using refresh token
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const grantType = body.grant_type

  // Get client credentials from Authorization header or body
  let clientId = body.client_id
  let clientSecret = body.client_secret

  // Try to parse Basic Auth header
  const authHeader = getHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString()
      const [id, secret] = decoded.split(':')
      clientId = id
      clientSecret = secret
    } catch {
      // Ignore, use body params
    }
  }

  // Validate client
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
      data: { error: 'invalid_client' }
    })
  }

  const client = verifyClient(clientId, clientSecret)
  if (!client) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
      data: { error: 'invalid_client' }
    })
  }

  // Authorization Code Grant
  if (grantType === 'authorization_code') {
    const code = body.code
    const redirectUri = body.redirect_uri

    if (!code || !redirectUri) {
      throw createError({
        statusCode: 400,
        message: 'Bad Request',
        data: { error: 'invalid_request' }
      })
    }

    // Verify code
    const authCode = useAuthCode(code)
    if (!authCode) {
      throw createError({
        statusCode: 400,
        message: 'Bad Request',
        data: { error: 'invalid_grant' }
      })
    }

    // Verify client and redirect URI match
    if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
      throw createError({
        statusCode: 400,
        message: 'Bad Request',
        data: { error: 'invalid_grant' }
      })
    }

    // Create tokens
    const accessToken = createAccessToken(clientId, authCode.userId, authCode.scope)
    const refreshToken = createRefreshToken(clientId, authCode.userId, authCode.scope)

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scope
    }
  }

  // Refresh Token Grant
  if (grantType === 'refresh_token') {
    const refreshTokenStr = body.refresh_token

    if (!refreshTokenStr) {
      throw createError({
        statusCode: 400,
        message: 'Bad Request',
        data: { error: 'invalid_request' }
      })
    }

    // Verify refresh token
    const refreshToken = getRefreshToken(refreshTokenStr)
    if (!refreshToken || refreshToken.clientId !== clientId) {
      throw createError({
        statusCode: 400,
        message: 'Bad Request',
        data: { error: 'invalid_grant' }
      })
    }

    // Create new access token
    const newAccessToken = createAccessToken(clientId, refreshToken.userId, refreshToken.scope)

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshTokenStr, // Reuse same refresh token
      scope: refreshToken.scope
    }
  }

  throw createError({
    statusCode: 400,
    message: 'Bad Request',
    data: { error: 'unsupported_grant_type' }
  })
})
