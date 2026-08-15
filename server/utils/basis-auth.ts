import type { H3Event, SessionManager } from "h3";
import { useSession } from "h3";
import * as oidc from "openid-client";
import { getPublicOrigin } from "~~/server/utils/oauth2";
import type { BasisAuthIdentity } from "~~/server/utils/database/users";

export const BASIS_AUTH_CALLBACK_PATH = "/api/auth/basis/callback";
const FLOW_MAX_AGE_SECONDS = 10 * 60;

export interface BasisAuthFlowTransaction {
    state: string;
    nonce: string;
    codeVerifier: string;
    postLoginRedirect?: string;
}

export interface BasisAuthConfig {
    issuer: string;
    clientId: string;
    clientSecret: string;
    resource: string;
}

export function getBasisAuthConfig(): BasisAuthConfig {
    const config = {
        issuer: process.env.BASIS_AUTH_ISSUER?.replace(/\/+$/, "") || "",
        clientId: process.env.BASIS_AUTH_CLIENT_ID || "",
        clientSecret: process.env.BASIS_AUTH_CLIENT_SECRET || "",
        resource: process.env.BASIS_AUTH_RESOURCE || "urn:basis:api:basishacks",
    };
    const missing = Object.entries(config)
        .filter(([, value]) => !value)
        .map(([name]) => name);
    if (missing.length > 0) {
        throw createError({
            statusCode: 500,
            message: `Missing basis-auth configuration: ${missing.join(", ")}`,
        });
    }
    return config;
}

export function getBasisAuthCallbackUrl(): string {
    return new URL(BASIS_AUTH_CALLBACK_PATH, getPublicOrigin()).href;
}

export function sanitizePostLoginRedirect(value?: string): string | undefined {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
    return value;
}

export async function getBasisAuthFlowSession(
    event: H3Event,
): Promise<SessionManager<BasisAuthFlowTransaction>> {
    const password = process.env.NUXT_SESSION_PASSWORD;
    if (!password) {
        throw createError({ statusCode: 500, message: "NUXT_SESSION_PASSWORD is not set" });
    }
    return await useSession<BasisAuthFlowTransaction>(event, {
        password,
        name: "basis-auth-flow",
        maxAge: FLOW_MAX_AGE_SECONDS,
        sessionHeader: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        },
    });
}

const discoveredConfigurations = new Map<string, Promise<oidc.Configuration>>();

export function getBasisAuthOidcConfiguration(config = getBasisAuthConfig()) {
    const cacheKey = `${config.issuer}\0${config.clientId}\0${config.clientSecret}`;
    let discovered = discoveredConfigurations.get(cacheKey);
    if (!discovered) {
        discovered = oidc.discovery(
            new URL(config.issuer),
            config.clientId,
            {
                client_secret: config.clientSecret,
                token_endpoint_auth_method: "client_secret_basic",
            },
            oidc.ClientSecretBasic(config.clientSecret),
            config.issuer.startsWith("http://")
                ? { execute: [oidc.allowInsecureRequests] }
                : undefined,
        );
        discoveredConfigurations.set(cacheKey, discovered);
    }
    return discovered;
}

export async function beginBasisAuthFlow(postLoginRedirect?: string) {
    const config = getBasisAuthConfig();
    const oidcConfiguration = await getBasisAuthOidcConfiguration(config);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const url = oidc.buildAuthorizationUrl(oidcConfiguration, {
        redirect_uri: getBasisAuthCallbackUrl(),
        response_type: "code",
        scope: "openid profile email",
        resource: config.resource,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    return {
        url,
        transaction: { state, nonce, codeVerifier, postLoginRedirect },
    };
}

export async function completeBasisAuthFlow(
    callbackUrl: URL,
    transaction: Partial<BasisAuthFlowTransaction>,
): Promise<BasisAuthIdentity> {
    if (!transaction.state || !transaction.nonce || !transaction.codeVerifier) {
        throw new Error("Login transaction is missing or expired");
    }

    const config = getBasisAuthConfig();
    const oidcConfiguration = await getBasisAuthOidcConfiguration(config);
    const canonicalCallbackUrl = new URL(
        callbackUrl.pathname + callbackUrl.search,
        getPublicOrigin(),
    );
    const tokens = await oidc.authorizationCodeGrant(oidcConfiguration, canonicalCallbackUrl, {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
    });
    const claims = tokens.claims();
    if (!claims?.sub || !tokens.access_token) {
        throw new Error("basis-auth did not return a complete token set");
    }

    const userInfo = await oidc.fetchUserInfo(oidcConfiguration, tokens.access_token, claims.sub);
    if (typeof userInfo.email !== "string" || !userInfo.email) {
        throw new Error("basis-auth did not return an email address");
    }

    return {
        issuer: config.issuer,
        subject: claims.sub,
        email: userInfo.email,
        emailVerified: userInfo.email_verified === true,
        name: typeof userInfo.name === "string" ? userInfo.name : undefined,
    };
}
