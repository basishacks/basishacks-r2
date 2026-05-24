import { completeAuthorizeSession, getAuthorizeSession, removeIfSessionExpired } from "./session.post"

/* Deletes and cancel the session */
export default defineEventHandler(async (event) => {

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

    const message = "User cancelled authorization request" // could write this whole flow in a future function

    const redir = session.redirect_uri + "?error=access_denied&error_description=" + encodeURI(message) + "&state=" + session.bh_state

    return {
        redirect_to: redir
    }

})