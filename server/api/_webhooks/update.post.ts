import { getMicrosoftWebhookState } from "~~/server/plugins/microsoft"


export default defineEventHandler(async (event) => {

    const body = await readBody(event)

    const value = body.value
    if (value == null || !Array.isArray(value) || value.length == 0) {
        console.warn("[MS Graph] Invalid MS Lifecycle")
        return createError({
            statusCode: 400,
            message: "Bad Request"
        })
    }

    const state = value[0].clientState
    if (state !== getMicrosoftWebhookState()) {
        console.warn("[MS Graph] Invalid MS Lifecycle state:", state)
        return createError({
            statusCode: 403,
            message: "Forbidden"
        })
    }

    const changeType = value[0].changeType
    const resource = value[0].resource

    console.log("[MS Graph] Webhook update received:", changeType, resource)

    setResponseStatus(event, 202)
    return {message: "Received"}

})