import { createOrGetExistingDirectChat, initializeChatbotWebhook, initializeDummyUserAccessToken } from "./microsoft"

export default defineNitroPlugin(async (nitroApp) => {
  console.log("[MS Graph] Loading DevClub user")

  await initializeDummyUserAccessToken()

//   const res = await createOrGetExistingDirectChat("ChunPing.Wong12024-bisz@basischina.com")

//   const id = res.id;

  await initializeChatbotWebhook()

})