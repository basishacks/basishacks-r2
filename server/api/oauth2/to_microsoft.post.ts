import { MicrosoftRedirectRequest } from "~~/shared/schemas"
import { AuthorizeSession, getAuthorizeSession } from "./session.post"
import { createHash, randomBytes } from "crypto"
import { structureLink } from "~~/shared/oauth2"

export function generateMicrosoftOAuth2Link(session: AuthorizeSession) {
  const state = randomBytes(75).toString("base64url")

  const pkce_code_verifier: string | null = randomBytes(74).toString("base64url")
  const pkce_code_challenge = createHash("sha256").update(pkce_code_verifier).digest("base64url")
  console.log("[Authorize -> ToMS] Requested MS OAuth2 Link: T:" + session.token.substring(0, 16) + "... Verif:" + pkce_code_verifier.substring(0, 16) + "... SHA256:" + pkce_code_challenge.substring(0, 16) + "...")

  session.ms_state = state
  session.ms_verifier = pkce_code_verifier

  return structureLink(state, pkce_code_challenge)
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "bridge_id")

  if (!token) {
    throw createError({
      status: 400,
      message: "Header 'bridge_id' is required"
    })
  }

  const session = getAuthorizeSession(token)

  if (!session) {
    throw createError({
      status: 400,
      message: "session_expired"
    })
  }

    const link = generateMicrosoftOAuth2Link(session)

    return {
        redirect_to: link
    }
})
