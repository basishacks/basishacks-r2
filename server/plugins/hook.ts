import initializeMSAccessToken from "./microsoft";

export default defineNitroPlugin(async (nitroApp) => {
  console.log("test")
  await initializeMSAccessToken();
})

