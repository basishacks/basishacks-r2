/*
 * Microsoft OAuth2 callback alias.
 *
 * Some Azure App Registrations use /api/auth as the redirect URI instead of
 * /api/oauth2/mscallback. This endpoint delegates to the canonical handler so
 * both paths work.
 */
import mscallbackHandler from '../oauth2/mscallback.get'

export default mscallbackHandler
