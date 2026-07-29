import type { H3Event } from "h3";
import {
    parseJWScopes,
    resolveOAuth2User,
    verifyAccessToken,
} from "~~/server/utils/oauth2-jwt";

export interface OAuth2UserInfoClaims {
    sub: string;
    name?: string | null;
    picture?: string | null;
    email?: string;
    email_verified?: boolean;
}

/**
 * Build OIDC UserInfo claims from a DB user and granted scopes.
 * Shared by GET /api/oauth2/userinfo and first-party onsite login.
 */
export function buildUserInfoClaims(
    user: User,
    scopes: string[],
): OAuth2UserInfoClaims {
    const claims: OAuth2UserInfoClaims = {
        sub: String(user.id),
    };

    if (scopes.includes("profile")) {
        claims.name = user.name;
        claims.picture = user.profile_picture;
    }

    if (scopes.includes("email")) {
        claims.email = user.email;
        claims.email_verified = true;
    }

    return claims;
}

/**
 * Resolve UserInfo claims for a bearer access token (same logic as the HTTP UserInfo endpoint).
 * Used in-process by onsite login; external clients call GET /api/oauth2/userinfo instead.
 */
export async function resolveUserInfoFromAccessToken(
    event: H3Event,
    accessToken: string,
): Promise<OAuth2UserInfoClaims> {
    const payload = await verifyAccessToken(accessToken);
    const scopes = parseJWScopes(payload.scope);
    const user = await resolveOAuth2User(event, payload);
    return buildUserInfoClaims(user, scopes);
}
