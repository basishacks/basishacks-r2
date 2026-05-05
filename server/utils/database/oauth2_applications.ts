import type { H3Event } from 'h3'

export async function getOAuth2Application(event: H3Event, clientID: string): Promise<OAuth2Application | null> {
  const result = await event.context.cloudflare.env.DB.prepare(
    `SELECT * FROM oauth2_applications WHERE client_id = "${clientID}"`
  )
    
  //console.log(`SELECT * FROM oauth2_applications WHERE client_id = "${clientID}"`)

  return await result.first() as OAuth2Application || null
}