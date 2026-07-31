export function getPublicOrigin(): string {
    const origin = process.env.CURRENT_URL_ORIGIN || "http://localhost:3000";
    return origin.replace(/\/+$/, "");
}

/**
 * OIDC issuer identifier (absolute URL, no trailing slash).
 * Must match JWT `iss` and the base used for `/.well-known/openid-configuration`.
 */
export function getOAuth2Issuer(): string {
    return getPublicOrigin();
}

export function getMicrosoftRedirectUri(): string {
    return process.env.MICROSOFT_REDIRECT_URI || "/api/oauth2/mscallback";
}

export function buildMicrosoftRedirectUri(origin?: string, redirectPath?: string): string {
    const base = origin || getPublicOrigin();
    const path = redirectPath || getMicrosoftRedirectUri();
    return new URL(path, base).href;
}

export function getOnsiteRedirectPath(): string {
    return process.env.REDIRECT_URI || "/api/oauth2/dccallback";
}

export function buildOnsiteRedirectUri(origin?: string): string {
    const base = origin || getPublicOrigin();
    const path = getOnsiteRedirectPath();
    return new URL(path, base).href;
}

const oAuth2Config = {
    base: "https://login.microsoftonline.com/",
    tenant: process.env.MICROSOFT_TENANT_ID || "",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    responseType: "code",
    get redirectUri() {
        return getMicrosoftRedirectUri();
    },
    scope: "openid profile email",
};

export default oAuth2Config;

export function structureLink(
    state: string,
    code_challenge: string,
    scope: string = oAuth2Config.scope,
    redirect_uri: string = getMicrosoftRedirectUri(),
) {
    const url = new URL(oAuth2Config.base + oAuth2Config.tenant + "/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", oAuth2Config.clientId);
    url.searchParams.set("response_type", oAuth2Config.responseType);
    url.searchParams.set("redirect_uri", buildMicrosoftRedirectUri(undefined, redirect_uri));
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", code_challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
}
