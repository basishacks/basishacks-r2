

/**
 * OAuth2 getApp Endpoint (GET)
 * 
 * Btw, not going to use pushed authorization requests yet. currently just building a demo.
 * will work on this when other apps r done.
 */

import type { AuthorizeSession} from "./session.post";
import { getAuthorizeSession, removeIfSessionExpired } from "./session.post"


export default defineEventHandler(async (event) => {

  const sessid = getCookie(event, "bridge_id")

  if (!sessid) {
    throw createError({
      statusCode: 400,
      message: "session_expired"
    })
  }

  const session: AuthorizeSession | null = getAuthorizeSession(sessid)
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

  return {
    client_id: session.application.client_id,
    name: session.application.name,
    description: session.application.description,
    type: session.application.type,
    session: session.token,
    login_state: session.login_state,
    user_id: session.user?.id || null,
    user: session.user as APIUser
  };
  
})
