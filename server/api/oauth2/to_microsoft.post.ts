import { MicrosoftRedirectRequest } from "~~/shared/schemas"
import { getAuthorizeSession } from "./session.post"
import { createHash, randomBytes } from "crypto"
import { structureLink } from "~~/shared/oauth2"

export default defineEventHandler(async (event) => {
  const { token } = await readValidatedBody(event, MicrosoftRedirectRequest.parse)

  const session = getAuthorizeSession(token)

  if (!session) {
    throw createError({
      status: 400,
      message: "session_expired"
    })
  }

  const state = randomBytes(75).toString("base64url")
  const pkce_code_verifier = randomBytes(74).toString("base64url")
  const pkce_code_challenge = createHash("sha256").update(pkce_code_verifier).digest("base64url")
  console.log("[Authorize -> ToMS] Requested MS OAuth2 Link: T:" + token.substring(0, 16) + "... Verif:" + pkce_code_verifier.substring(0, 16) + "... SHA256:" + pkce_code_challenge.substring(0, 16) + "...")

  session.ms_state = state
  session.ms_verifier = pkce_code_verifier

  return {
    redirect_to: structureLink(state, pkce_code_challenge)
  }
})
