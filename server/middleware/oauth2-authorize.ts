import { defineEventHandler } from 'h3'
import { randomBytes } from 'node:crypto'
import { validateOAuth2AuthorizationRequest } from '~/../server/utils/oauth2-validate'
import { addAuthorizeSession, attachAuthorizeSessionCookie, AuthorizeSession, constructSession } from '../api/oauth2/session.post'
import { generateMicrosoftOAuth2Link } from '../api/oauth2/to_microsoft.post'

/**
 * OAuth2 Authorization Middleware
 * Validates client_id and requested scopes for OAuth2 authorization flow
 * Similar to the validation in authorize.vue page
 */
export default defineEventHandler(async (event) => {
  // Only validate authorize routes
  if (!event.node.req.url?.includes('/api/oauth2/authorize')) {
    return
  }

  const query = getQuery(event)
  const client_id = query.client_id as string
  const scope = query.scope as string
  const redirect_uri = query.redirect_uri as string | undefined
  const state = query.state as string | undefined

  try {
    const validatedRequest = await validateOAuth2AuthorizationRequest(
        event,
        client_id,
        scope,
        redirect_uri || '',
        query.state as string,
        query.response_type as string,
        query.code_challenge as string,
        query.code_challenge_method as string
    )

    const app: OAuth2Application = validatedRequest?.app as OAuth2Application
    
    const session: AuthorizeSession = constructSession(redirect_uri || '', app, query.state as string, query.code_challenge as string, query.code_challenge_method as string)
    
    addAuthorizeSession(session)

    attachAuthorizeSessionCookie(session, event)

    if (app.proxy_microsoft) {
      // instant redirect mode, skip basishacks login
      const link = generateMicrosoftOAuth2Link(session)

      console.log("[Authorization -> OAuth2] Microsoft proxy application " + app.client_id)

      return sendRedirect(event, link)
    }
    

    
  } catch (err: any) {
    console.warn("[Authorization -> OAuth2] User requested faulty oauth link:", err.message || err)
    // throw createError({
    //   statusCode: err.statusCode || 400,
    //   message: err.message || 'Invalid OAuth2 authorization request',
    // })
    // Not throwing any error here, because it will show the default error page but
    // not the one in OAuth login

    const payload = {
      message: err.message
    }

    return setCookie(event, "bridge_error", Buffer.from(JSON.stringify(payload)).toString("base64url"), {
      maxAge: 10 * 60, // 10 mins
      secure: true,
      sameSite: 'lax'
    })

  }

  
})
