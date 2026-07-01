const oAuth2Config = {
    base: "https://login.microsoftonline.com/",
    tenant: "cbc6e1e2-a6bb-4002-bbdc-6da892a051a7",
    clientId: "868b989e-6574-4795-bcfb-8db37bee1c37",
    responseType: "code",
    redirectUri: "/api/oauth2/mscallback",
    scope: "openid profile email",
}

export default oAuth2Config;

export function structureLink(
  state: string,
  code_challenge: string,
  scope: string = oAuth2Config.scope,
  redirect_uri: string = oAuth2Config.redirectUri
) {
  const baseUrl = process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000'
  const url = new URL(
    oAuth2Config.base + oAuth2Config.tenant + '/oauth2/v2.0/authorize'
  )
  url.searchParams.set('client_id', oAuth2Config.clientId)
  url.searchParams.set('response_type', oAuth2Config.responseType)
  url.searchParams.set('redirect_uri', baseUrl + redirect_uri)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', code_challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}
