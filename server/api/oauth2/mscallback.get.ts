

import oAuth2Config from '~~/shared/oauth2';
import { getAuthorizeSession } from './session.post';
import { createHash } from 'crypto';


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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const token = getCookie(event, "bridge_id") // sessid
  deleteCookie(event, "bridge_id")

  if (!code) {
    throw createError({
      status: 400,
      message: 'Login Failed: No valid Microsoft OAuth2 code provided. Please ensure you are redirected here with a valid code, or try using alternative login options.',
    })
  }

  if (!token) {
    throw createError({
      status: 400,
      message: "Your login session does not exist or has expired. Please login again."
    })
  }

  const session = getAuthorizeSession(token)

  if (!session) {
    throw createError({
      status: 400,
      message: "Your login session does not exist or has expired. Please login again."
    })
  }

  const hashed = createHash("sha256").update(session.ms_verifier || "").digest("base64url")
  console.log("[Authorize -> MSCallBack] Requested Redeeming MS Code: T:" + token.substring(0, 16) + "... Verif:" + session?.ms_verifier?.substring(0, 16) + "... SHA256:" + hashed.substring(0, 16) + "...")

  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!msClientSecret) {
    throw createError({
      status: 500,
      message: 'Server configuration error: MICROSOFT_CLIENT_SECRET is not set. Please configure it in .env to enable Microsoft OAuth2 login.',
    })
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
      const error = await tokenResponse.json()
      console.error('[Authorize -> MSCallBack] Token exchange failed:', error.error, error.error_description)
      throw createError({
        status: 401,
        message: 'Failed to exchange authorization code: ' + error.error_description || 'Unknown error',
      })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token


    const decodedToken = decodeJWT(accessToken)
    const email = decodedToken.mail || decodedToken.email || decodedToken.upn || decodedToken.preferred_username
    const name = decodedToken.name

    console.log(email, name)

    if (!email) {
      throw createError({
        status: 401,
        message: 'Failed to extract user email from token',
      })
    }

    // Step 3: Find or create user in database
    let user = await getUserByEmail(event, email)

    if (!user) {
      // Create new user
      user = await addCodeToUser(event, email)
      if (!user.id) {
        throw createError({
          status: 500,
          message: 'Failed to create user',
        })
      }
    }

    user.name = name || user.name
    await updateUserName(event, user);

    // Step 4: Set user session with nuxt-auth-utils
    await setUserSession(event, {
      user: {
        id: user.id,
      },
    })

    return sendRedirect(event, '/dashboard')
  } catch (error) {
    console.error('OAuth callback error:', error)
    throw createError({
      status: 500,
      message: 'Authentication failed: ' + (error instanceof Error ? error.message : String(error)),
    })
  }
})
