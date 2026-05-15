import { jwtVerify } from 'jose'
import { exchangeAuthorizationCode } from './session.post'

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

    console.log('[Authorize -> OAuth2] Dummy code: ' + getQuery(event).code)

    let result: string
    try {
        result = await exchangeAuthorizationCode(getQuery(event).code as string)
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
        },
    })

    

    await sendRedirect(event, '/dashboard', 302)
})