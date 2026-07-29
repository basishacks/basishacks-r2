import { withOAuth2JWT } from "~~/server/utils/oauth2-jwt";
import { buildUserInfoClaims } from "~~/server/utils/oauth2-userinfo";

/**
 * OAuth2 UserInfo Endpoint
 *
 * Returns standardized user claims based on the scopes granted in the access token.
 * Requires Authorization: Bearer <access_token> header.
 *
 * Claims returned:
 * - sub (always)
 * - name, picture (if 'profile' scope granted)
 * - email, email_verified (if 'email' scope granted)
 *
 * External clients call this HTTP endpoint. First-party onsite login uses the
 * same buildUserInfoClaims / resolveUserInfoFromAccessToken helpers in-process.
 */
export default withOAuth2JWT(
    async (event) => {
        const { scopes, user } = event.context.oauth2!;
        return buildUserInfoClaims(user!, scopes);
    },
    { loadUser: true },
);
