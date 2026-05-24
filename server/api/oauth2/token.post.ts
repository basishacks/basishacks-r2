/*
 * OAuth2 Token Endpoint
 *
 * Exchanges an authorization code for a JWT access token.
 * Supports application/x-www-form-urlencoded and JSON request bodies.
 */
import { exchangeAuthorizationCode } from './session.post'
import { getOAuth2Application, validateOAuth2ApplicationSecret } from '~~/server/utils/database/oauth2_applications'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const grantType = body.grant_type
  const code = body.code
  const clientId = body.client_id
  const clientSecret = body.client_secret
  const redirectUri = body.redirect_uri

  if (grantType !== 'authorization_code') {
    throw createError({
      statusCode: 400,
      statusMessage: 'unsupported_grant_type',
      message: 'Only authorization_code grant type is supported'
    })
  }

  if (!code || !clientId || !clientSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request',
      message: 'code, client_id, and client_secret are required'
    })
  }

  const app = await getOAuth2Application(event, clientId)
  if (!app) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_client',
      message: 'Invalid client_id'
    })
  }

  const isSecretValid = await validateOAuth2ApplicationSecret(event, clientId, clientSecret)
  if (!isSecretValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_client',
      message: 'Invalid client_secret'
    })
  }

  // Validate redirect_uri if provided
  if (redirectUri) {
    if (app.redirect_uris) {
      const allowedRedirectUris = app.redirect_uris.split(' ').filter((u: string) => u)
      if (!allowedRedirectUris.includes(redirectUri)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'invalid_grant',
          message: 'Invalid redirect_uri'
        })
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid_grant',
        message: 'Application has no configured redirect URIs'
      })
    }
  }

  try {
    const jwt = await exchangeAuthorizationCode(code, clientId, redirectUri)

    return {
      access_token: jwt,
      token_type: 'Bearer',
      expires_in: 3600
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_grant',
      message: e.message || 'Failed to exchange authorization code'
    })
  }
})
