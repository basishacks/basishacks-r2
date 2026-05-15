const oAuth2Config = {
    base: "https://login.microsoftonline.com/",
    tenant: "cbc6e1e2-a6bb-4002-bbdc-6da892a051a7",
    clientId: "868b989e-6574-4795-bcfb-8db37bee1c37",
    responseType: "code",
    redirectUri: "/api/oauth2/mscallback",
    scope: "openid profile email",
}

export default oAuth2Config;

const baseUrl = process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000'

export function structureLink(state: string, code_challenge: string, scope: string = oAuth2Config.scope, redirect_uri: string = oAuth2Config.redirectUri) {
    return oAuth2Config.base + oAuth2Config.tenant + "/oauth2/v2.0/authorize?client_id=" + oAuth2Config.clientId + "&response_type=" + oAuth2Config.responseType 
    + "&redirect_uri=" + baseUrl + redirect_uri
    + "&scope=" + encodeURI(scope)
    + "&state=" + state
    + "&code_challenge=" + code_challenge 
    + "&code_challenge_method=S256"
    
}

