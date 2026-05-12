import { defineEventHandler } from 'h3'
import { randomBytes } from 'node:crypto'
import { validateOAuth2AuthorizationRequest } from '~/../server/utils/oauth2-validate'

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
        client_id || '',
        scope || '',
        redirect_uri || '',
        state || ''
    )

    const login_session = randomBytes(64).toString('base64url')

    event.context.oauth = {
      client_id,
      scope,
      redirect_uri,
      login_session
    }
    

    
  } catch (err: any) {
    console.warn("User requested faulty oauth link:", err.message || err)
    throw createError({
      statusCode: err.statusCode || 400,
      message: err.message || 'Invalid OAuth2 authorization request',
    })
  }

  
})
