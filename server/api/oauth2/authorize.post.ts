import { createAuthCode } from '~/../server/utils/oauth2'

/**
 * OAuth2 Authorization Endpoint (POST)
 * Handle consent form submission
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const action = body.action

  // Get stored auth request from cookie (set by middleware)
  const authCookie = getCookie(event, 'oauth2_auth_request')
  if (!authCookie) {
    throw createError({
      statusCode: 400,
      message: 'Authorization session expired'
    })
  }

  let authRequest: any
  try {
    authRequest = JSON.parse(authCookie)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid authorization session'
    })
  }

  // User denied
  if (action === 'deny') {
    deleteCookie(event, 'oauth2_auth_request')
    const url = new URL(authRequest.redirect_uri)
    url.searchParams.append('error', 'access_denied')
    if (authRequest.state) url.searchParams.append('state', authRequest.state)
    return sendRedirect(event, url.toString())
  }

  // User approved
  if (action === 'approve') {
    // Create authorization code
    const code = createAuthCode(
      authRequest.client_id,
      body.user_id || 1,
      authRequest.redirect_uri,
      authRequest.scope
    )

    deleteCookie(event, 'oauth2_auth_request')

    // Redirect to callback with code
    const url = new URL(authRequest.redirect_uri)
    url.searchParams.append('code', code)
    if (authRequest.state) url.searchParams.append('state', authRequest.state)

    return sendRedirect(event, url.toString())
  }

  throw createError({
    statusCode: 400,
    message: 'Invalid action'
  })
})
