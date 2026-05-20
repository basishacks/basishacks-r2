import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'

export async function createOAuth2Application(
  event: H3Event,
  name: string,
  description: string | null,
  proxyMicrosoft: boolean
): Promise<OAuth2Application> {
  const client_id = crypto.randomUUID()
  const client_secret = randomBytes(32).toString('hex')

  event.context.db.prepare(
    `INSERT INTO oauth2_applications (client_id, client_secret, name, description, proxy_microsoft, type)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(client_id, client_secret, name, description, proxyMicrosoft ? 1 : 0, 'third').run()

  return {
    client_id,
    client_secret,
    name,
    description,
    proxy_microsoft: proxyMicrosoft ? 1 : 0,
    type: 'third',
    redirect_uris: null,
    permissions: null,
    profile_picture: null,
  }
}

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
