import initializeMSAccessToken from "./microsoft";

export default defineNitroPlugin(async (nitroApp) => {
  await initializeMSAccessToken();
})

