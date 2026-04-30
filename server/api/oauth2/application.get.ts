

/**
 * OAuth2 getApp Endpoint (GET)
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.client_id) {
    throw createError({
        statusCode: 400,
        statusMessage: "Parameter 'client_id' is required"
    })
  }

  if (!query.scope) {
    throw createError({
        statusCode: 400,
        statusMessage: "Parameter 'scope' is required"
    })
  }

  const scopes = decodeURI(query.scope.toString()).split(' ')
  console.log(scopes)

  const app = await getOAuth2Application(event, query.client_id as string);

  if (!app) {
    throw createError({
        statusCode: 404,
        statusMessage: `The client '${query.client_id}' does not exist or is not a valid configured application.`
    })
  }

  return {
    client_id: app.client_id,
    name: app.name,
    description: app.description
  };
})
