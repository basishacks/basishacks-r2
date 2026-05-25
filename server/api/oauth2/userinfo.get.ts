import { withOAuth2JWT } from '~~/server/utils/oauth2-jwt'

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
 */
export default withOAuth2JWT(
  async (event) => {
    const { payload, scopes, user } = event.context.oauth2!

    const claims: Record<string, any> = {
      sub: String(user!.id),
    }

    if (scopes.includes('profile')) {
      claims.name = user!.name
      claims.picture = user!.profile_picture
    }

    if (scopes.includes('email')) {
      claims.email = user!.email
      claims.email_verified = true
    }

    return claims
  },
  { loadUser: true }
)
