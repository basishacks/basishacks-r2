import type { H3Event, EventHandler } from "h3";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getUserByBasisAuthSubject } from "./database/users";
import { getBasisAuthConfig } from "./basis-auth";

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getBasisAuthJwks(issuer: string) {
    let jwks = jwksByIssuer.get(issuer);
    if (!jwks) {
        jwks = createRemoteJWKSet(new URL("/oauth/jwks", issuer));
        jwksByIssuer.set(issuer, jwks);
    }
    return jwks;
}

// ------------------------------------------------------------------
// Low-level: verify a raw JWT string
// ------------------------------------------------------------------

export interface OAuth2JWTPayload {
    sub?: string;
    client_id?: string;
    scope?: string;
    permissions?: string[];
    [key: string]: any;
}

/**
 * Verify a raw JWT access token and return its payload.
 * Throws 401 errors for invalid or expired tokens.
 */
export async function verifyAccessToken(token: string): Promise<OAuth2JWTPayload> {
    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Empty access token",
        });
    }

    const config = getBasisAuthConfig();
    try {
        const { payload } = await jwtVerify(token, getBasisAuthJwks(config.issuer), {
            algorithms: ["RS256"],
            issuer: config.issuer,
            audience: config.resource,
            typ: "at+jwt",
        });
        if (
            !payload.sub ||
            typeof payload.client_id !== "string" ||
            typeof payload.scope !== "string"
        ) {
            throw new Error("Access token claims are invalid");
        }
        return payload as OAuth2JWTPayload;
    } catch {
        throw createError({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Invalid or expired access token",
        });
    }
}

// ------------------------------------------------------------------
// Mid-level: extract Bearer token from H3 event
// ------------------------------------------------------------------

/**
 * Extract the Bearer token from the Authorization header.
 * Throws 401 if the header is missing or malformed.
 */
export function extractBearerToken(event: H3Event): string {
    const authHeader = getHeader(event, "authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        throw createError({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Missing or invalid Authorization header",
        });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Empty access token",
        });
    }

    return token;
}

// ------------------------------------------------------------------
// Mid-level: verify JWT from H3 event
// ------------------------------------------------------------------

/**
 * Extract and verify the Bearer token from an H3 event.
 * Returns the decoded JWT payload.
 */
export async function verifyOAuth2JWT(event: H3Event): Promise<OAuth2JWTPayload> {
    const token = extractBearerToken(event);
    return await verifyAccessToken(token);
}

// ------------------------------------------------------------------
// Scope helpers
// ------------------------------------------------------------------

/**
 * Parse a space-separated scope string into an array.
 */
export function parseJWScopes(scope: unknown): string[] {
    if (typeof scope !== "string") return [];
    return scope.split(" ").filter(Boolean);
}

/**
 * Check if the given scopes include every required scope.
 */
export function requireScopes(grantedScopes: string[], requiredScopes: string[]): void {
    const missing = requiredScopes.filter((s) => !grantedScopes.includes(s));
    if (missing.length > 0) {
        throw createError({
            statusCode: 403,
            statusMessage: "insufficient_scope",
            message: `Missing required scope(s): ${missing.join(", ")}`,
        });
    }
}

// ------------------------------------------------------------------
// User helper
// ------------------------------------------------------------------

/**
 * Resolve the stable basis-auth subject, then fetch its linked local user.
 */
export async function resolveOAuth2User(event: H3Event, payload: OAuth2JWTPayload) {
    if (!payload.sub) {
        throw createError({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Token missing user identification",
        });
    }

    const user = await getUserByBasisAuthSubject(event, getBasisAuthConfig().issuer, payload.sub);
    if (!user) {
        throw createError({
            statusCode: 404,
            message: "User not found",
        });
    }

    return user;
}

// ------------------------------------------------------------------
// High-level: wrapper options
// ------------------------------------------------------------------

export interface OAuth2JWTWrapperOptions {
    /**
     * List of scopes that the token must have.
     * If empty, no scope check is performed.
     */
    requiredScopes?: string[];

    /**
     * Whether to load the user from the database and attach it to event.context.
     * Default: false
     */
    loadUser?: boolean;
}

export interface OAuth2JWTContext {
    payload: OAuth2JWTPayload;
    scopes: string[];
    user?: User;
}

// ------------------------------------------------------------------
// High-level: H3 event handler wrapper
// ------------------------------------------------------------------

/**
 * Wrap an API handler so that it requires a valid OAuth2 JWT Bearer token.
 *
 * Options:
 *   - requiredScopes: scopes the token must include
 *   - loadUser: fetch the DB user and attach to event.context.oauth2.user
 *
 * The wrapped handler can read `event.context.oauth2` for the payload, scopes,
 * and (optionally) the user row.
 *
 * Example:
 *   export default withOAuth2JWT(async (event) => {
 *     const { payload, scopes, user } = event.context.oauth2
 *     return { sub: user.id }
 *   }, { requiredScopes: ['profile'], loadUser: true })
 */
export function withOAuth2JWT(
    handler: (event: H3Event) => any,
    options: OAuth2JWTWrapperOptions = {},
): EventHandler {
    return async (event) => {
        const payload = await verifyOAuth2JWT(event);
        const scopes = parseJWScopes(payload.scope);

        if (options.requiredScopes && options.requiredScopes.length > 0) {
            requireScopes(scopes, options.requiredScopes);
        }

        const ctx: OAuth2JWTContext = { payload, scopes };

        if (options.loadUser) {
            ctx.user = await resolveOAuth2User(event, payload);
        }

        // @ts-ignore extend context dynamically
        event.context.oauth2 = ctx;

        return await handler(event);
    };
}
