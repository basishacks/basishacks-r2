import type { H3Event } from 'h3'
import { getOAuth2Application } from './database/oauth2_applications'
import { env } from 'node:process'

/**
 * Validates OAuth2 authorization request parameters
 * @param event H3 event object
 * @param clientId Client application ID
 * @param scope Requested scopes (space-separated)
 * @param redirectUri Optional redirect URI to validate
 * @returns Validated request object or throws error
 */
export async function validateOAuth2AuthorizationRequest(
  event: H3Event,
  clientId: string,
  scope: string,
  
  redirectUri: string,
  state: string,
  response_type: string,
  code_challenge: string,
  code_challenge_type: string
  
) {

  let protocol: number = 3; // 2.1

  // Validate required parameters
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: "Parameter 'client_id' is required"
    })
  }

  if (!scope) {
    throw createError({
      statusCode: 400,
      message: "Parameter 'scope' is required"
    })
  }

  if (!state) {
    throw createError({
      statusCode: 400,
      message: "Parameter 'state' is required"
    })
  }

  if (!redirectUri) {
    throw createError({
      statusCode: 400,
      message: "Parameter 'redirect_uri' is required"
    })
  }

  if (!code_challenge || !code_challenge_type) {
    // 2.0
    protocol = 2 // 2.0
    console.log("[Authorization -> OAuth2] Request uses legacy 2.0 protocol " + clientId)
  }

  // Decode and parse requested scopes
  let requestedScopes: string[]
  try {
    requestedScopes = decodeURI(scope).split(' ').filter(s => s)
  } catch {
    throw createError({
      statusCode: 400,
      message: "Invalid 'scope' parameter"
    })
  }

  if (requestedScopes.length === 0) {
    throw createError({
      statusCode: 400,
      message: "At least one scope must be requested"
    })
  }

  // Validate client application exists
  const app = await getOAuth2Application(event, clientId)

  if (!app) {
    throw createError({
      statusCode: 404,
      message: `The client '${clientId}' does not exist or is not a valid configured application.`
    })
  }

  // Validate requested scopes against app permissions
  if (app.permissions) {
    const allowedScopes = app.permissions.split(' ').filter(s => s)
    const unauthorizedScopes = requestedScopes.filter(scope => !allowedScopes.includes(scope))

    if (unauthorizedScopes.length > 0) {
      throw createError({
        statusCode: 403,
        message: `Application '${app.name}' does not have permission for the following scope(s): ${unauthorizedScopes.join(', ')}`
      })
    }
  } else if (requestedScopes.length > 0) {
    throw createError({
      statusCode: 403,
      message: `Application '${app.name}' has no configured permissions`
    })
  }

  // Validate redirect_uri if provided
  if (redirectUri) {
    if (app.redirect_uris) {
      const allowedRedirectUris = app.redirect_uris.split(' ').filter(u => u)
      if (!allowedRedirectUris.includes(redirectUri)) {
        throw createError({
          statusCode: 403,
          message: `Invalid redirect_uri. The provided redirect_uri is not registered for this application.`
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: `Application '${app.name}' has no configured redirect URIs`
      })
    }
  }

  return {
    client_id: app.client_id,
    app_name: app.name,
    requested_scopes: requestedScopes,
    redirect_uri: redirectUri,
    app
  }
}
