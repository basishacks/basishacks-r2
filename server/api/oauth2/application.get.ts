

/**
 * OAuth2 getApp Endpoint (GET)
 */
import { validateOAuth2AuthorizationRequest } from '~/../server/utils/oauth2-validate'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  try {
    const req: any = await validateOAuth2AuthorizationRequest(
        event,
        query.client_id as string,
        query.scope as string,
        query.redirect_uri as string | undefined
    );

    return {
        client_id: req.app.client_id,
        name: req.app.name,
        description: req.app.description
    };
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'An error occurred while validating the application'
    })
  }

  
})
