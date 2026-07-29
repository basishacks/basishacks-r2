import { buildOpenIdConfiguration } from "~~/server/utils/openid-configuration";

/**
 * OpenID Connect Discovery (RFC 8414 / OIDC Discovery 1.0)
 *
 * GET /.well-known/openid-configuration
 */
export default defineEventHandler((event) => {
    setHeader(event, "Cache-Control", "public, max-age=3600");
    setHeader(event, "Content-Type", "application/json");
    return buildOpenIdConfiguration();
});
