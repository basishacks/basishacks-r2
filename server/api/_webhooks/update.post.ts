import { getMicrosoftWebhookState } from '~~/server/plugins/microsoft'

export default defineEventHandler(async (event) => {
  // Microsoft Graph sends a validation token as a query parameter during subscription creation/renewal.
  // The endpoint MUST respond with 200 OK and echo the token as text/plain.
  const query = getQuery(event)
  const validationToken = query.validationToken as string | undefined
  if (validationToken) {
    setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setResponseStatus(event, 200)
    return validationToken
  }

  const body = await readBody(event)

  const value = body.value
  if (value == null || !Array.isArray(value) || value.length == 0) {
    console.warn('[MS Graph] Invalid MS Webhook Update')
    return createError({
      statusCode: 400,
      message: 'Bad Request',
    })
  }

  const state = value[0].clientState
  if (state !== getMicrosoftWebhookState()) {
    console.warn('[MS Graph] Invalid MS Webhook state:', state)
    return createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  const changeType = value[0].changeType
  const resource = value[0].resource

  console.log('[MS Graph] Webhook update received:', changeType, resource)

  setResponseStatus(event, 200)
  return { message: 'Received' }
})
