import type { H3Event } from 'h3'

export async function getOAuth2Application(event: H3Event, clientID: string): Promise<OAuth2Application | null> {
  const result = event.context.db.prepare(
    `SELECT * FROM oauth2_applications WHERE client_id = ?`
  ).bind(clientID)
    
  //console.log(`SELECT * FROM oauth2_applications WHERE client_id = ?`)

  return result.first() as OAuth2Application || null
}