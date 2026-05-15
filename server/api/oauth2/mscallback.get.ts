

import oAuth2Config, { structureLink } from '~~/shared/oauth2';
import { generateExchangeCode, getAuthorizeSession } from './session.post';
import { createHash } from 'crypto';
import { constructOnSiteLoginURL } from '../login.get';


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

function setErrorCookieAndRedirect(event: any, error: string, description: string) {

  const payload = {
    message: error + ": " + description
  }

  setCookie(event, "bridge_error", Buffer.from(JSON.stringify(payload)).toString("base64url"), {
    maxAge: 10 * 60, // 10 mins
    secure: true,
    sameSite: 'lax'
  })

  return sendRedirect(event, constructOnSiteLoginURL())
}

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)

  if (query.error) { // This point will be rarely 
    console.log("[Authorize -> OAuth2] MS Endpoint error: " + query.error + ": " + query.error_description)
    
    return setErrorCookieAndRedirect(event, query.error as string, query.error_description as string)

    
  }

  const code = query.code as string
  const token = getCookie(event, "bridge_id") // sessid

  if (!code) {

    return setErrorCookieAndRedirect(event, "invalid_request", 'Login Failed: No valid Microsoft OAuth2 code provided. Please ensure you are redirected here with a valid code, or try using alternative login options.')
  }

  if (!token) {

    return setErrorCookieAndRedirect(event, "invalid_request", "Your login session does not exist or has expired. Please login again.")
  }

  const session = getAuthorizeSession(token)

  if (!session) {
    throw createError({
      status: 400,
      message: "Your login session does not exist or has expired. Please login again."
    })
  }

  deleteCookie(event, "bridge_id") // only delete after sucessful

  

  const hashed = createHash("sha256").update(session.ms_verifier || "").digest("base64url")
  console.log("[Authorize -> MSCallBack] Requested Redeeming MS Code: T:" + token.substring(0, 16) + "... Verif:" + session?.ms_verifier?.substring(0, 16) + "... SHA256:" + hashed.substring(0, 16) + "...")

  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!msClientSecret) {

    return setErrorCookieAndRedirect(event, "access_denied", 'Server configuration error: MICROSOFT_CLIENT_SECRET is not set. Please configure it in .env to enable Microsoft OAuth2 login.')
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

      return setErrorCookieAndRedirect(event, "access_denied", 'Failed to exchange authorization code: ' + error.error_description || 'Unknown error')
    }

    const tokenData: any = await tokenResponse.json()
    const accessToken = tokenData.access_token

    const decodedToken = decodeJWT(accessToken)
    const email = decodedToken.mail || decodedToken.email || decodedToken.upn || decodedToken.preferred_username
    const name = decodedToken.name
    if (!email) {
      return setErrorCookieAndRedirect(event, "access_denied", "Failed to exchange authorization code: Invalid or malformed token")
    }

    // Step 3: Find or create user in database
    let user = await getUserByEmail(event, email)

    if (!user) {
      // Create new user
      user = await addCodeToUser(event, email)
      if (!user.id) {

        return setErrorCookieAndRedirect(event, "access_denied", "Failed to exchange authorization code: Failed to create user")
      }
    }

    user.name = name || user.name
    await updateUserName(event, user);

    session.user = user
    //console.log("[Authorization -> OAuth2] Attached connect MS User")
    

    generateExchangeCode(session)

    const redir = session.redirect_uri + "?code=" + session.code + "&state=" + session.bh_state

    console.log("[Authorization -> OAuth2] MS Token Exchange sucess " + session.redirect_uri)

    return sendRedirect(event, redir)
  } catch (error) {
    console.error('OAuth callback error:', error)

    return setErrorCookieAndRedirect(event, "access_denied", "Failed to exchange authorization code: " + (error instanceof Error ? error.message : String(error)))
  }
})
