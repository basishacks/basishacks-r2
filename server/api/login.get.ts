import { randomBytes } from "crypto"

export default defineEventHandler(async (event) => {
    const state = randomBytes(128).toString("base64url")
    const origin = process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000'
    const redirectUri = encodeURIComponent(`${origin}/${process.env.REDIRECT_URI}`||`${origin}/api/auth`)
    const url = `/api/oauth2/authorize?client_id=97e435f4-17e8-42ef-9b12-9684fd656de9&response_type=code&redirect_uri=${redirectUri}&scope=openid%20profile%20email&state=` + state
    await sendRedirect(event, url, 301)
})