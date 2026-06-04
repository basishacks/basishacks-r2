/**
 * OAuth2 getApp Endpoint (POST)
 *
 * Btw, not going to use pushed authorization requests yet. currently just building a demo.
 * will work on this when other apps r done.
 *
 * This page is used to refresh sessions
 *
 */
import { createHash, randomBytes } from "crypto";
import { SignJWT } from "jose";
import { validateOAuth2AuthorizationRequest } from "~/../server/utils/oauth2-validate";

export interface AuthorizeSession {
    ms_verifier: string | null;
    ms_state: string | null;
    token: string;
    redirect_uri: string;
    granted_time: number;
    expire_time: number;
    application: OAuth2Application;
    user: User | null;
    teams_code: string | null;
    bh_state: string;
    bh_verifier_challenge: string;
    bh_verifier_challenge_method: string;
    scopes: string[];
    /**
     * "identification" = just identified the app. user has to login or enter email
     * "requesting" = requesting external resource, from ms oauth or from email/code
     * "consent" = user logged in and awaiting for consent (skippabe if trusted app or insensitive scopes)
     * "completed" = session completed, code generated, waiting for token exchange
     */
    login_state: "identification" | "requesting" | "consent" | "completed";
    code: string | null;
}

const AUTHORIZE_SESSION_STORE: Record<string, AuthorizeSession> = {};
const AUTHORIZE_SESSION_CODE_INDEX: Map<string, string> = new Map();

// Periodic cleanup: remove expired sessions every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const token in AUTHORIZE_SESSION_STORE) {
        const session = AUTHORIZE_SESSION_STORE[token];
        if (session && now > session.expire_time) {
            if (session.code) {
                AUTHORIZE_SESSION_CODE_INDEX.delete(session.code);
            }
            delete AUTHORIZE_SESSION_STORE[token];
        }
    }
}, 60_000);

export function addAuthorizeSession(session: AuthorizeSession) {
    AUTHORIZE_SESSION_STORE[session.token] = session;
}

export function getAuthorizeSession(token: string): AuthorizeSession | null {
    const session = AUTHORIZE_SESSION_STORE[token] || null;
    if (!session) return null;
    if (Date.now() > session.expire_time) {
        if (session.code) {
            AUTHORIZE_SESSION_CODE_INDEX.delete(session.code);
        }
        delete AUTHORIZE_SESSION_STORE[token];
        return null;
    }
    return session;
}

export function completeAuthorizeSession(token: string) {
    const session = AUTHORIZE_SESSION_STORE[token];
    if (session?.code) {
        AUTHORIZE_SESSION_CODE_INDEX.delete(session.code);
    }
    delete AUTHORIZE_SESSION_STORE[token];
}

export function generateExchangeCode(session: AuthorizeSession) {
    const code = randomBytes(128).toString("base64url");
    session.code = code;
    AUTHORIZE_SESSION_CODE_INDEX.set(code, session.token);
}

export async function exchangeAuthorizationCode(
    code: string,
    clientId?: string,
    redirectUri?: string,
    scope?: string,
    codeVerifier?: string,
): Promise<string> {
    const secret = process.env.NUXT_OAUTH2_JWT_SECRET;
    if (!secret) {
        throw new Error("NUXT_OAUTH2_JWT_SECRET is not set");
    }

    const key = new TextEncoder().encode(secret);

    const token = AUTHORIZE_SESSION_CODE_INDEX.get(code);
    if (!token) {
        throw new Error("Invalid authorization code");
    }

    const session = AUTHORIZE_SESSION_STORE[token];
    if (!session) {
        AUTHORIZE_SESSION_CODE_INDEX.delete(code);
        throw new Error("Invalid authorization code");
    }

    if (Date.now() > session.expire_time) {
        AUTHORIZE_SESSION_CODE_INDEX.delete(code);
        delete AUTHORIZE_SESSION_STORE[token];
        throw new Error("Authorization code has expired");
    }

    if (!session.user) {
        throw new Error("No user attached to session");
    }

    if (clientId && session.application.client_id !== clientId) {
        throw new Error("client_id mismatch");
    }

    if (redirectUri && session.redirect_uri !== redirectUri) {
        throw new Error("redirect_uri mismatch");
    }

    // PKCE verification
    if (session.bh_verifier_challenge && session.bh_verifier_challenge_method) {
        if (!codeVerifier) {
            throw new Error("code_verifier is required for PKCE");
        }

        let verified = false;
        if (session.bh_verifier_challenge_method === "S256") {
            const hash = createHash("sha256").update(codeVerifier).digest("base64url");
            verified = hash === session.bh_verifier_challenge;
        } else {
            verified = codeVerifier === session.bh_verifier_challenge;
        }

        if (!verified) {
            throw new Error("Invalid code_verifier");
        }
    }

    const jwt = await new SignJWT({
        sub: String(session.user.id),
        user_id: session.user.id,
        client_id: session.application.client_id,
        redirect_uri: session.redirect_uri,
        scope: session.scopes, // must supply a scope
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("basishacks")
        .setAudience(session.application.client_id)
        .setIssuedAt(Date.now())
        .setExpirationTime("1h")
        .sign(key);

    completeAuthorizeSession(session.token);
    return jwt;
}

export function constructSession(
    redirect_uri: string,
    app: OAuth2Application,
    state: string,
    code_challenge: string,
    code_challenge_method: string,
    scope: string,
): AuthorizeSession {
    const sessid = randomBytes(128).toString("base64url");

    const session: AuthorizeSession = {
        token: sessid,
        granted_time: Date.now(),
        expire_time: Date.now() + 10 * 60 * 1000, // 10 minutes
        redirect_uri: redirect_uri,
        application: app,
        user: null,
        teams_code: null,
        ms_state: null,
        ms_verifier: null,
        bh_state: state,
        bh_verifier_challenge: code_challenge,
        bh_verifier_challenge_method: code_challenge_method,
        scopes: decodeURI(scope)
            .split(" ")
            .filter((s) => s),
        login_state: "identification",
        code: null,
    };

    return session;
}

export function removeIfSessionExpired(session: AuthorizeSession) {
    if (Date.now() > session.expire_time) {
        completeAuthorizeSession(session.token);
        return true;
    }
    return false;
}

export function attachAuthorizeSessionCookie(session: AuthorizeSession, event: any) {
    setCookie(event, "bridge_id", session.token, {
        maxAge: 10 * 60, // 10 mins
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });
}
// Used for session refreshes only
export default defineEventHandler(async (event) => {
    // throw createError({
    //   statusCode: 410,
    //   message: "Deprecated. Use GET /api/oauth2/session"
    // })

    const body = await readBody(event);

    try {
        const req: any = await validateOAuth2AuthorizationRequest(
            event,
            body.client_id as string,
            body.scope as string,
            body.redirect_uri as string,
            body.state as string,
            body.response_type as string,
            body.code_challenge as string,
            body.code_challenge_method as string,
        );

        const session: AuthorizeSession = constructSession(
            body.redirect_uri,
            req.app,
            body.state,
            body.code_challenge,
            body.code_challenge_method,
            body.scope,
        );

        addAuthorizeSession(session);

        attachAuthorizeSessionCookie(session, event);

        return {
            client_id: req.app.client_id,
            name: req.app.name,
            description: req.app.description,
            type: req.app.type,
            session: session.token,
        };
    } catch (err: any) {
        throw createError({
            statusCode: err.statusCode || 500,
            message: err.message || "An error occurred while validating the application",
        });
    }
});
