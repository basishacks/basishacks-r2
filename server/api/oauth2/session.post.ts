

/**
 * OAuth2 getApp Endpoint (POST)
 * 
 * Btw, not going to use pushed authorization requests yet. currently just building a demo.
 * will work on this when other apps r done.
 */
import { randomBytes } from 'crypto';
import { validateOAuth2AuthorizationRequest } from '~/../server/utils/oauth2-validate'

interface AuthorizeSession {
  ms_verifier: string | null;
  ms_state: string | null;
  token: string,
  granted_time: number,
  expire_time: number,
  application: any,
  user: User | null,
  teams_code: string | null
}

const AUTHORIZE_SESSION_STORE: Record<string, AuthorizeSession> = {}

function addAuthorizeSession(session: AuthorizeSession) {
  AUTHORIZE_SESSION_STORE[session.token] = session
}

export function getAuthorizeSession(token: string): AuthorizeSession | null {
  const session = AUTHORIZE_SESSION_STORE[token] || null
  if (!session) return null
  if (Date.now() > session.expire_time) {
    delete AUTHORIZE_SESSION_STORE[token]
    return null
  }
  return session
}

export function completeAuthorizeSession(token: string) {
  delete AUTHORIZE_SESSION_STORE[token]
}



export default defineEventHandler(async (event) => {


  const body = await readBody(event)


  try {
    const req: any = await validateOAuth2AuthorizationRequest(
        event,
        body.client_id as string,
        body.scope as string,
        body.redirect_uri as string,
        body.state as string
    );

    const sessid = randomBytes(128).toString("base64url")

    const session: AuthorizeSession = {
      token: sessid,
      granted_time: Date.now(),
      expire_time: Date.now() + (10 * 60 * 1000), // 10 minutes
      application: req.app,
      user: null,
      teams_code: null,
      ms_state: null,
      ms_verifier: null
    }

    addAuthorizeSession(session)


    setCookie(event, 'bridge_id', sessid, {
      maxAge: 10 * 60, // 10 mins
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    })

    return {
        client_id: req.app.client_id,
        name: req.app.name,
        description: req.app.description,
        type: req.app.type,
        session: sessid
    };

    
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'An error occurred while validating the application'
    })
  }

  
})
