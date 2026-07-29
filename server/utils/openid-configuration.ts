import { OAuth2ScopesList } from "~~/shared/oauth2-scopes";
import { getOAuth2Issuer } from "~~/server/utils/oauth2";

/**
 * OpenID Connect Discovery 1.0 / OAuth 2.0 Authorization Server Metadata
 * reflecting the endpoints and capabilities this server actually implements.
 */
export function buildOpenIdConfiguration(issuer?: string) {
    const iss = issuer ?? getOAuth2Issuer();

    return {
        issuer: iss,
        authorization_endpoint: `${iss}/api/oauth2/authorize`,
        token_endpoint: `${iss}/api/oauth2/token`,
        userinfo_endpoint: `${iss}/api/oauth2/userinfo`,
        // HS256 shared-secret access tokens — no public JWKS is published.
        response_types_supported: ["code"],
        response_modes_supported: ["query"],
        grant_types_supported: ["authorization_code"],
        subject_types_supported: ["public"],
        // Access tokens are JWT (HS256). No ID tokens are issued.
        id_token_signing_alg_values_supported: [] as string[],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        token_endpoint_auth_signing_alg_values_supported: ["HS256"],
        scopes_supported: [...OAuth2ScopesList],
        claims_supported: ["sub", "name", "picture", "email", "email_verified"],
        code_challenge_methods_supported: ["S256", "plain"],
        claim_types_supported: ["normal"],
        request_parameter_supported: false,
        request_uri_parameter_supported: false,
        require_request_uri_registration: false,
        claims_parameter_supported: false,
        // Authorization requests require PKCE (code_challenge + method).
    };
}

export type OpenIdConfiguration = ReturnType<typeof buildOpenIdConfiguration>;
