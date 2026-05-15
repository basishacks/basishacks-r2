import initializeMSAccessToken, { initializeDummyUserAccessToken } from "./microsoft";

export default defineNitroPlugin(async (nitroApp) => {

  await initializeMSAccessToken();

  await initializeDummyUserAccessToken();
})

