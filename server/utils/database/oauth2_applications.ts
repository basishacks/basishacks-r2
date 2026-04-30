import type { H3Event } from 'h3'

export async function getOAuth2Application(event: H3Event, clientID: string): Promise<OAuth2Application | null> {
  const result = await event.context.cloudflare.env.DB.prepare(
    'SELECT * FROM oauth2_applications WHERE client_id = "?"'
  )
    .bind(clientID)
    .first<OAuth2Application>()
  return result
}