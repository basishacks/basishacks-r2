import { readValidatedBody } from 'h3'
import { OAuth2SessionActionRequest } from '~~/shared/schemas'
import { completeAuthorizeSession, getAuthorizeSession, removeIfSessionExpired } from "./session.post"

/* Deletes and handles the OAuth2 authorize session */
export default defineEventHandler(async (event) => {

  const body = await readValidatedBody(event, OAuth2SessionActionRequest.parse)

  const sessid = getCookie(event, "bridge_id")

  if (!sessid) {
    // No session ID found in cookies
    throw createError({
        statusCode: 400,
        message: "Cookie 'bridge_id' is required"
    })
  }

  const session = getAuthorizeSession(sessid)

  if (!session) {
    throw createError({
      statusCode: 400,
      message: "session_expired"
      })
    }

    if (removeIfSessionExpired(session)) {
        throw createError({
          statusCode: 400,
          message: "session_expired"
        })
    }

    completeAuthorizeSession(session.token)

    let message: string
    let redir: string

    if (body.action === 'cancel' || body.action === 'deny') {
      message = body.action === 'cancel'
        ? "User cancelled authorization request"
        : "User denied authorization request"

      redir = session.redirect_uri + "?error=access_denied&error_description=" + encodeURI(message) + "&state=" + session.bh_state
    } else {
      // consent
      redir = session.redirect_uri + "?code=" + encodeURIComponent(session.token) + "&state=" + session.bh_state
    }

    return {
        redirect_to: redir
    }

})