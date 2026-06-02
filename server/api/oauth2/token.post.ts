/*
 * OAuth2 Token Endpoint
 *
 * Exchanges an authorization code for a JWT access token.
 * Accepts application/x-www-form-urlencoded (standard) and JSON request bodies.
 */
import { exchangeAuthorizationCode } from './session.post'
import { getOAuth2Application, validateOAuth2ApplicationSecret } from '~~/server/utils/database/oauth2_applications'
import { OAuth2TokenRequest } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {

  console.log("[Authorize -> OAuth2] Token endpoint hit")

  const contentType = getRequestHeader(event, 'content-type') || ''

  let rawBody: any
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await readRawBody(event)
    rawBody = Object.fromEntries(new URLSearchParams(text))
  } else {
    rawBody = await readBody(event)
  }



  let body: OAuth2TokenRequest
  try {
    console.log(rawBody)
    body = await OAuth2TokenRequest.parseAsync(rawBody)
  } catch (err: any) {
    const issues = err.issues?.map((i: any) => i.message).join(', ')
    const message = issues || err.message || 'Invalid request'
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request',
      message
    })
  }

  const { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code_verifier: codeVerifier } = body

  const app = await getOAuth2Application(event, clientId)
  if (!app) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_client',
      message: 'Invalid client_id',
    });
  }

  const isSecretValid = await validateOAuth2ApplicationSecret(event, clientId, clientSecret);
  if (!isSecretValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_client',
      message: 'Invalid client_secret',
    });
  }

  // Validate redirect_uri if provided
  if (redirectUri) {
    if (app.redirect_uris) {
      const allowedRedirectUris = app.redirect_uris.split(' ').filter((u: string) => u);
      if (!allowedRedirectUris.includes(redirectUri)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'invalid_grant',
          message: 'Invalid redirect_uri',
        });
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid_grant',
        message: 'Application has no configured redirect URIs',
      });
    }
  }

  try {
    const jwt = await exchangeAuthorizationCode(code, clientId, redirectUri, app.permissions || '', codeVerifier)

    console.log("[Authorize -> OAuth2] Token redeemed for client_id: " + clientId + ", issued JWT: " + jwt.substring(0, 16) + "...")

    return {
      access_token: jwt,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_grant',
      message: e.message || 'Failed to exchange authorization code',
    });
  }
});
