import { jwtVerify } from 'jose'
import { exchangeAuthorizationCode } from './session.post'

export default defineEventHandler(async (event) => {
    console.log('[Authorize -> OAuth2] Recieved code: ' + getQuery(event).code)

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
            token: payload
        },
    })

    await sendRedirect(event, '/dashboard', 302)
})