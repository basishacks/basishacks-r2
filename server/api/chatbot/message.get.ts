import {
    createOrGetExistingDirectChat,
    sendChatMessage,
    sendRichChatMessage,
} from "~~/server/plugins/microsoft";
import { NethackPermissions } from "~~/shared/permissions";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
    await requireUser(event, NethackPermissions.Chatbot.use);

    const { id } = await createOrGetExistingDirectChat("ChunPing.Wong12024-bisz@basischina.com");

    await sendRichChatMessage(
        id,
        "<h1>Hello from DevClub Hackathon Portal!</h1><p>This is a test message sent using Microsoft Graph API.</p>",
    );

    return { test: "ok" };
});
