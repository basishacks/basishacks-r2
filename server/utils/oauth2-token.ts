import type { H3Event } from "h3";
import { exchangeAuthorizationCode } from "~~/server/api/oauth2/session.post";
import {
    getOAuth2Application,
    validateOAuth2ApplicationSecret,
} from "~~/server/utils/database/oauth2_applications";

export const OAUTH2_ACCESS_TOKEN_EXPIRES_IN = 3600;

export interface OAuth2AccessTokenResponse {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
}

export interface RedeemAuthorizationCodeInput {
    code: string;
    clientId: string;
    redirectUri?: string;
    /** Application permissions string (space-separated); passed through for exchange checks. */
    appPermissions?: string;
    codeVerifier?: string;
}

export interface IssueOAuth2AccessTokenInput {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    codeVerifier?: string;
}

/**
 * Core authorization-code → access_token step after the caller has authenticated
 * the OAuth2 client (client_secret for external apps, first-party session binding
 * for onsite login).
 *
 * External HTTP clients must not call this directly; they use POST /api/oauth2/token.
 */
export async function redeemAuthorizationCodeForToken(
    input: RedeemAuthorizationCodeInput,
): Promise<OAuth2AccessTokenResponse> {
    const accessToken = await exchangeAuthorizationCode(
        input.code,
        input.clientId,
        input.redirectUri,
        input.appPermissions ?? "",
        input.codeVerifier,
    );

    return {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: OAUTH2_ACCESS_TOKEN_EXPIRES_IN,
    };
}

/**
 * Full confidential-client token issuance used by POST /api/oauth2/token.
 * Validates client_id, client_secret, and redirect_uri, then redeems the code.
 */
export async function issueOAuth2AccessToken(
    event: H3Event,
    input: IssueOAuth2AccessTokenInput,
): Promise<OAuth2AccessTokenResponse> {
    const app = await getOAuth2Application(event, input.clientId);
    if (!app) {
        throw createError({
            statusCode: 400,
            statusMessage: "invalid_client",
            message: "Invalid client_id",
        });
    }

    const isSecretValid = await validateOAuth2ApplicationSecret(
        event,
        input.clientId,
        input.clientSecret,
    );
    if (!isSecretValid) {
        throw createError({
            statusCode: 400,
            statusMessage: "invalid_client",
            message: "Invalid client_secret",
        });
    }

    if (input.redirectUri) {
        if (app.redirect_uris) {
            const allowedRedirectUris = app.redirect_uris.split(" ").filter((u: string) => u);
            if (!allowedRedirectUris.includes(input.redirectUri)) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "invalid_grant",
                    message: "Invalid redirect_uri",
                });
            }
        } else {
            throw createError({
                statusCode: 400,
                statusMessage: "invalid_grant",
                message: "Application has no configured redirect URIs",
            });
        }
    }

    try {
        const tokenResponse = await redeemAuthorizationCodeForToken({
            code: input.code,
            clientId: input.clientId,
            redirectUri: input.redirectUri,
            appPermissions: app.permissions || "",
            codeVerifier: input.codeVerifier,
        });

        console.log(
            "[Authorize -> OAuth2] Token redeemed for client_id: " +
                input.clientId +
                ", issued JWT: " +
                tokenResponse.access_token.substring(0, 16) +
                "...",
        );

        return tokenResponse;
    } catch {
        throw createError({
            statusCode: 400,
            statusMessage: "invalid_grant",
            message: "Failed to exchange authorization code",
        });
    }
}
