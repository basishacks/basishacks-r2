import type { H3Event } from 'h3'
import { getOAuth2Application } from './database/oauth2_applications'
import type { AuthorizeSession } from '../api/oauth2/session.post'
import { completeAuthorizeSession, generateExchangeCode } from '../api/oauth2/session.post'
import { OAuth2Scopes } from '~~/shared/oauth2-scopes';

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

  // Validate response_type
  if (response_type && response_type !== 'code') {
    throw createError({
      statusCode: 400,
      statusMessage: 'unsupported_response_type'
    })
  }

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
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request: PKCE required'
    })
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
      message: `No matching application found for client_id '${clientId}'`
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
          message: `Application '${app.name}' does not allow redirect_uri '${redirectUri}'`
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

export function usedSensitiveScopes(session: AuthorizeSession): boolean {
  for (const scope of session.scopes) {
    const s = OAuth2Scopes[scope]
    if (s?.sensitive) {
      console.log("[Authorization -> OAuth2] Application " + session.application.client_id + " requests sensitive scope " + scope + ", triggering consent")
      return true
    }
  }

  return false
}

/** Called after mscallback is sucessful and returns the next step.
 * 
 * Only two things can happen:
 * immediately redirect to the uri.
 * IF AN APPLICATION IS REQUESTING SENSITIVE SCOPES OAuth2Scopes.sensitive, redirect to authorization consent page
 */
export function determinePostMicrosoft(event: any, session: AuthorizeSession): string {
  const sensitive = usedSensitiveScopes(session)
  if (sensitive) {
    session.login_state = 'consent'
    const params = new URLSearchParams()
    params.set('client_id', session.application.client_id)
    params.set('scope', session.scopes.join(' '))
    params.set('redirect_uri', session.redirect_uri)
    params.set('state', session.bh_state)
    params.set('response_type', 'code')
    if (session.bh_verifier_challenge) {
      params.set('code_challenge', session.bh_verifier_challenge)
    }
    if (session.bh_verifier_challenge_method) {
      params.set('code_challenge_method', session.bh_verifier_challenge_method)
    }
    return '/api/oauth2/authorize?' + params.toString()
  }

  return completeConsentFlow(event, session)
}

export function completeConsentFlow(event: any, session: AuthorizeSession): string {
  generateExchangeCode(session)
  session.login_state = 'completed'
  deleteCookie(event, 'bridge_id') // only delete after sucessful
  const separator = session.redirect_uri.includes('?') ? '&' : '?'
  const redirectParam = session.post_login_redirect
    ? `&redirect=${encodeURIComponent(session.post_login_redirect)}`
    : ''
  return (
    session.redirect_uri +
    separator +
    'code=' +
    encodeURIComponent(session.code) +
    '&state=' +
    encodeURIComponent(session.bh_state) +
    redirectParam
  )
}