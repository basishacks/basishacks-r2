import { jwtVerify } from 'jose'
import { exchangeAuthorizationCode, getAuthorizeSession } from './session.post'

/*
 * Note: This is like an demo app endpoint that DevConnect redirects to
 *
 * In other words, this endpoint is like a valid redirect_uri of a valid app
 * in DevConnect. It takes the code and exchange for a token just like any
 * OAuth2 app would do.
 *
 * When uesd externally, the exchange code function (exchangeAuthorizationCode)
 * would be written in a fetch request to a specific endpoint (basically token.post.ts)
 * to get the token instead
 *
 */
export default defineEventHandler(async (event) => {

    const error = getQuery(event).error

    if (error) {
        const description = getQuery(event).error_description
        console.log("[Authorize -> OAuth2] Recieved error: " + description)

        await sendRedirect(event, "/", 302)
    }

    // Require bridge_id cookie to bind the callback to an existing authorize session
    const bridgeId = getCookie(event, 'bridge_id')
    if (!bridgeId) {
        throw createError({
            statusCode: 400,
            message: 'Missing bridge_id cookie'
        })
    }

    const session = getAuthorizeSession(bridgeId)
    if (!session) {
        throw createError({
            statusCode: 400,
            message: 'Authorize session not found or expired'
        })
    }

    // Validate state parameter against the session's bh_state
    const state = getQuery(event).state as string | undefined
    if (!state || state !== session.bh_state) {
        throw createError({
            statusCode: 400,
            message: 'State parameter mismatch'
        })
    }

    console.log('[Authorize -> OAuth2] Dummy code: ' + getQuery(event).code)

    let result: string
    try {
        result = await exchangeAuthorizationCode(
            getQuery(event).code as string,
            session.application.client_id,
            session.redirect_uri,
            session.scopes.join(' '),
            session.ms_verifier ?? undefined,
        )
    } catch (e: any) {
        throw createError({
            statusCode: 400,
            message: "invalid_grant: " + e.message
        })
    }
    // this function can be used externally like in another website

    const secret = process.env.NUXT_OAUTH2_JWT_SECRET
    if (!secret) {
        throw new Error('NUXT_OAUTH2_JWT_SECRET is not set')
    }

    const { payload } = await jwtVerify(result, new TextEncoder().encode(secret))
    const userId = Number(payload.user_id)

    await setUserSession(event, {
        user: {
            id: userId,
            token: payload,
            token_raw: result
        },
    })



    const redirect = getQuery(event).redirect as string | undefined
    await sendRedirect(event, redirect || '/dashboard', 302)
})