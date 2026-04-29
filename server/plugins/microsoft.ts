import { env } from "node:process";


export default async function initializeMSAccessToken() {
    const data = await fetch("https://login.microsoftonline.com/{your-tenant-id}/oauth2/v2.0/token",{
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encodeURI(
            "client_id=cbc6e1e2-a6bb-4002-bbdc-6da892a051a7&" +
            "scope=https://graph.microsoft.com/.default&" +
            "client_secret=" + env.MICROSOFT_CLIENT_SECRET + "&" +
            "grant_type=client_credentials"
        )
    })

    console.log(data)

}