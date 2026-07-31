export default defineNitroPlugin(() => {
    const sessionPassword = process.env.NUXT_SESSION_PASSWORD;
    const isProduction = process.env.NODE_ENV === "production";
    const sessionPasswordLength = sessionPassword
        ? new TextEncoder().encode(sessionPassword).length
        : 0;

    if (!sessionPassword || sessionPasswordLength < 32) {
        const reason = sessionPassword
            ? `only ${sessionPasswordLength} bytes (must be at least 32 bytes)`
            : "not set";
        if (isProduction) {
            console.error(
                `[FATAL] NUXT_SESSION_PASSWORD is ${reason}. ` +
                    "Set it to a strong secret (e.g. openssl rand -base64 32) and restart the server.",
            );
            process.exit(1);
        } else {
            console.warn(
                `[WARNING] NUXT_SESSION_PASSWORD is ${reason}. ` +
                    "Session encryption will be weak or unavailable until it is configured.",
            );
        }
    }

    const msTenantId = process.env.MICROSOFT_TENANT_ID;
    const msClientId = process.env.MICROSOFT_CLIENT_ID;
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const msConfigValues = [msTenantId, msClientId, msClientSecret];
    const msConfigSetCount = msConfigValues.filter(Boolean).length;

    const jwtSecret = process.env.NUXT_OAUTH2_JWT_SECRET;
    const jwtSecretLength = jwtSecret ? new TextEncoder().encode(jwtSecret).length : 0;
    if (!jwtSecret || jwtSecretLength < 32) {
        const reason = jwtSecret
            ? `only ${jwtSecretLength} bytes (must be at least 32 bytes)`
            : "not set";
        console.error(
            `[FATAL] NUXT_OAUTH2_JWT_SECRET is ${reason}. ` +
                "Set it to a strong secret (e.g. openssl rand -base64 32) and restart the server.",
        );
        process.exit(1);
    }

    if (msConfigSetCount > 0 && msConfigSetCount < 3) {
        console.warn(
            "[WARNING] Microsoft OAuth2 configuration is incomplete. " +
                `Configured: ${msConfigSetCount}/3 ` +
                "(MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET). " +
                "Microsoft OAuth2 login and Graph features will be unavailable until all three are configured.",
        );
    }
});
