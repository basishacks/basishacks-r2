import { getChatbotWebhookId, getMicrosoftWebhookState, refreshChatbotWebhook } from "~~/server/plugins/microsoft"

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

    const lifecycleEvent = value[0].lifecycleEvent
    console.log("[MS Graph] Webhook lifecycle received:", lifecycleEvent)

    if (lifecycleEvent === "reauthorizationRequired") {
        refreshChatbotWebhook().then(() => {
            console.log("[MS Graph] Chatbot webhook refreshed successfully")
        }).catch((err) => {
            console.error("[MS Graph] Failed to refresh chatbot webhook:", err)
        })

    }

    setResponseStatus(event, 202)
    return {message: "Received"}

})