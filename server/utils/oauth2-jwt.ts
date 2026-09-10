import type { H3Event } from "h3";
import { accessTokenClaimsSchema, type AccessTokenClaims } from "@basis/schema/auth";
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

export type OAuth2JWTPayload = AccessTokenClaims;

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
        return accessTokenClaimsSchema.parse(payload);
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
// User helper
// ------------------------------------------------------------------

/**
 * Resolve the stable basis-auth subject, then fetch its linked local user.
 */
export async function resolveOAuth2User(event: H3Event, payload: Pick<OAuth2JWTPayload, "sub">) {
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

export interface OAuth2JWTContext {
    payload: OAuth2JWTPayload;
    permissions: string[];
    user?: User;
}
