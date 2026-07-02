

import oAuth2Config, { structureLink } from '~~/server/utils/oauth2';
import { generateExchangeCode, getAuthorizeSession } from './session.post';
import { createHash } from 'crypto';
import { determinePostMicrosoft } from '~~/server/utils/oauth2-validate';


function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    const payload = parts[1]
    //@ts-ignore Lol.
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return {}
  }
}

function getFallbackRedirectUri(): string {
  return (process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000') + '/' + (process.env.REDIRECT_URI || 'api/oauth2/dccallback')
}

function redirectWithOAuth2Error(event: any, redirectUri: string, error: string, errorDescription: string, state?: string | null) {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error)
  url.searchParams.set('error_description', errorDescription)
  if (state) url.searchParams.set('state', state)
  return sendRedirect(event, url.toString())
}

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const token = getCookie(event, "bridge_id")
  const session = token ? getAuthorizeSession(token) : null

  const errorRedirectUri = session?.redirect_uri || getFallbackRedirectUri()
  const errorState = session?.bh_state || null

  if (query.error) {
    console.log("[Authorize -> OAuth2] MS Endpoint error: " + query.error + ": " + query.error_description)
    return redirectWithOAuth2Error(event, errorRedirectUri, query.error as string, (query.error_description as string) || 'Unknown error', errorState)
  }

  const code = query.code as string

  if (!code) {
    return redirectWithOAuth2Error(event, errorRedirectUri, "invalid_request", 'Login Failed: No valid Microsoft OAuth2 code provided. Please ensure you are redirected here with a valid code, or try using alternative login options.', errorState)
  }

  if (!token) {
    return redirectWithOAuth2Error(event, getFallbackRedirectUri(), "invalid_request", "Your login session does not exist or has expired. Please login again.")
  }

  if (!session) {
    return redirectWithOAuth2Error(event, getFallbackRedirectUri(), "invalid_request", "Your login session does not exist or has expired. Please login again.")
  }

  

  const hashed = createHash("sha256").update(session.ms_verifier || "").digest("base64url")
  console.log("[Authorize -> MSCallBack] Requested Redeeming MS Code: T:" + token.substring(0, 16) + "... Verif:" + session?.ms_verifier?.substring(0, 16) + "... SHA256:" + hashed.substring(0, 16) + "...")

  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!msClientSecret) {
    return redirectWithOAuth2Error(event, errorRedirectUri, "access_denied", 'Server configuration error: MICROSOFT_CLIENT_SECRET is not set. Please configure it in .env to enable Microsoft OAuth2 login.', errorState)
  }

  try {
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${oAuth2Config.tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: oAuth2Config.clientId,
          code: code,
          client_secret: msClientSecret,
          code_verifier: session.ms_verifier || '',
          redirect_uri: (process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000') + oAuth2Config.redirectUri,
          grant_type: 'authorization_code',
          scope: oAuth2Config.scope,
        }).toString(),
      }
    )

    if (!tokenResponse.ok) {
      const error: any = await tokenResponse.json()
      console.error('[Authorize -> MSCallBack] Token exchange failed:', error.error, error.error_description)

      return redirectWithOAuth2Error(event, errorRedirectUri, "access_denied", 'Failed to exchange authorization code: ' + (error.error_description || 'Unknown error'), errorState)
    }

    const tokenData: any = await tokenResponse.json()
    const accessToken = tokenData.access_token

    const decodedToken = decodeJWT(accessToken)
    const email = decodedToken.mail || decodedToken.email || decodedToken.upn || decodedToken.preferred_username
    const name = decodedToken.name
    if (!email) {
      return redirectWithOAuth2Error(event, errorRedirectUri, "access_denied", "Failed to exchange authorization code: Invalid or malformed token", errorState)
    }

    // Step 3: Find or create user in database
    let user = await getUserByEmail(event, email)

    if (!user) {
      // Create new user
      user = await addCodeToUser(event, email)
      if (!user.id) {
        return redirectWithOAuth2Error(event, errorRedirectUri, "access_denied", "Failed to exchange authorization code: Failed to create user", errorState)
      }
    }

    user.name = name || user.name
    await updateUserName(event, user);

    session.user = user

    const redir = determinePostMicrosoft(event, session)

    console.log("[Authorization -> OAuth2] MS Token Exchange sucess " + session.redirect_uri)

    return sendRedirect(event, redir)
  } catch (error) {
    console.error('OAuth callback error:', error)

    return redirectWithOAuth2Error(event, errorRedirectUri, "access_denied", "Failed to exchange authorization code: " + (error instanceof Error ? error.message : String(error)), errorState)
  }
})
