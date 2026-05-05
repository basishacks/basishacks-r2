

/**
 * OAuth2 getApp Endpoint (GET)
 */
import { validateOAuth2AuthorizationRequest } from '~/../server/utils/oauth2-validate'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const client_id = getRouterParam(event, 'id') as string // id is client_id

  try {
    const req: any = await validateOAuth2AuthorizationRequest(
        event,
        client_id,
        query.scope as string,
        query.redirect_uri as string
    );

    return {
        client_id: client_id,
        name: req.app.name,
        description: req.app.description,
        type: req.app.type
    };
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'An error occurred while validating the application'
    })
  }

  
})
