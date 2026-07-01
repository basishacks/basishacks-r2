import { randomBytes } from "crypto"
import { AuthorizeSession } from "./oauth2/session.post"

export function constructOnSiteLoginURL(postLoginRedirect?: string) {
    /* Constructs DevConnect OAuth URL
    */
    const state = randomBytes(128).toString("base64url")
    const origin = process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000'
    const redirectUri = encodeURIComponent(`${origin}/${process.env.REDIRECT_URI}`)
    let url = `/api/oauth2/authorize?client_id=97e435f4-17e8-42ef-9b12-9684fd656de9&response_type=code&redirect_uri=${redirectUri}&scope=openid%20profile%20email&state=` + state
    if (postLoginRedirect) {
        url += `&post_login_redirect=${encodeURIComponent(postLoginRedirect)}`
    }
    return url
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    await sendRedirect(event, constructOnSiteLoginURL(query.redirect as string | undefined), 302)
})