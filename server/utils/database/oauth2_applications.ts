import type { H3Event } from 'h3'

export async function getOAuth2Application(event: H3Event, clientID: string): Promise<OAuth2Application | null> {
  const result = event.context.db.prepare(
    `SELECT * FROM oauth2_applications WHERE client_id = ?`
  ).bind(clientID)

  //console.log(`SELECT * FROM oauth2_applications WHERE client_id = ?`)

  return result.first() as OAuth2Application || null
}

export async function getAllOAuth2Applications(event: H3Event): Promise<OAuth2Application[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM oauth2_applications ORDER BY name ASC'
    ).all() as { results: OAuth2Application[] }
  ).results
}

export async function deleteOAuth2Applications(event: H3Event, clientIDs: string[]) {
  for (const id of clientIDs) {
    event.context.db.prepare(
      'DELETE FROM oauth2_applications WHERE client_id = ?'
    ).bind(id).run()
  }
}
