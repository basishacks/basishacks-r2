import { randomBytes } from "crypto";
import { AuthorizeSession } from "./oauth2/session.post";

export function constructOnSiteLoginURL() {
    /* Constructs DevConnect OAuth URL
     */
    const state = randomBytes(128).toString("base64url");
    const origin = process.env.CURRENT_URL_ORIGIN || "http://localhost:3000";
    const redirectUri = encodeURIComponent(`${origin}/${process.env.REDIRECT_URI}`);
    const url =
        `/api/oauth2/authorize?client_id=97e435f4-17e8-42ef-9b12-9684fd656de9&response_type=code&redirect_uri=${redirectUri}&scope=openid%20profile%20email&state=` +
        state;
    return url;
}

export default defineEventHandler(async (event) => {
    await sendRedirect(event, constructOnSiteLoginURL(), 302);
});
