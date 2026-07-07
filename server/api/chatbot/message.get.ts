import {
    createOrGetExistingDirectChat,
    sendChatMessage,
    sendRichChatMessage,
} from "~~/server/plugins/microsoft";

export default withOAuth2JWT(
    async (event) => {
        const { payload, scopes, user } = event.context.oauth2!;

        const { id } = await createOrGetExistingDirectChat(
            "ChunPing.Wong12024-bisz@basischina.com",
        );

        await sendRichChatMessage(
            id,
            "<h1>Hello from DevClub Hackathon Portal!</h1><p>This is a test message sent using Microsoft Graph API.</p>",
        );

        return { test: "ok" };
    },
    { requiredScopes: ["chat.readwrite"], loadUser: true },
);
