import type { H3Event } from 'h3'
import { createHash, randomBytes } from 'node:crypto'

const MAX_APPLICATIONS_PER_USER = 2

export async function getOAuth2ApplicationCountByOwner(event: H3Event, ownerId: number): Promise<number> {
  const result = event.context.db.prepare(
    'SELECT COUNT(*) as count FROM oauth2_applications WHERE owner_id = ?'
  ).bind(ownerId).first() as { count: number } | null

  return result?.count ?? 0
}

export async function createOAuth2Application(
  event: H3Event,
  ownerId: number,
  name: string,
  description: string | null,
  proxyMicrosoft: boolean,
  type: 'first' | 'third' = 'third'
): Promise<OAuth2Application> {
  const client_id = crypto.randomUUID()

  event.context.db.prepare(
    `INSERT INTO oauth2_applications (client_id, client_secret, name, description, proxy_microsoft, type, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(client_id, '', name, description, proxyMicrosoft ? 1 : 0, type, ownerId).run()

  return {
    client_id,
    client_secret: '',
    name,
    description,
    proxy_microsoft: proxyMicrosoft ? 1 : 0,
    type,
    redirect_uris: null,
    permissions: null,
    profile_picture: null,
    owner_id: ownerId,
  }
}

export async function getOAuth2Application(event: H3Event, clientID: string): Promise<OAuth2Application | null> {
  const result = event.context.db.prepare(
    `SELECT * FROM oauth2_applications WHERE client_id = ?`
  ).bind(clientID)

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

// --- Secret management using the space-separated client_secret column ---

export function abbreviateSecretHash(hash: string): string {
  return `sha256:${hash.slice(0, 8)}...${hash.slice(-8)}`
}

export async function getOAuth2ApplicationSecretAbbreviated(
  event: H3Event,
  clientID: string
): Promise<string[]> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.client_secret) return []

  const parts = app.client_secret.split(' ').filter(h => h)
  return parts
    .filter(p => /^[a-f0-9]{64}$/i.test(p))
    .map(abbreviateSecretHash)
}

export async function addOAuth2ApplicationSecret(
  event: H3Event,
  clientID: string
): Promise<{ plainSecret: string }> {
  const plainSecret = randomBytes(32).toString('hex')
  const secretHash = createHash('sha256').update(plainSecret).digest('hex')

  const app = await getOAuth2Application(event, clientID)
  const existing = app?.client_secret ? app.client_secret.split(' ').filter(h => h) : []
  const newValue = [...existing, secretHash].join(' ')

  event.context.db.prepare(
    `UPDATE oauth2_applications SET client_secret = ? WHERE client_id = ?`
  ).bind(newValue, clientID).run()

  return { plainSecret }
}

export async function removeOAuth2ApplicationSecret(
  event: H3Event,
  clientID: string,
  abbreviated: string
): Promise<void> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.client_secret) {
    throw createError({ status: 404, message: 'No secrets found' })
  }

  const parts = app.client_secret.split(' ').filter(h => h)
  const match = abbreviated.match(/^sha256:([a-f0-9]{8})\.\.\.([a-f0-9]{8})$/i)

  if (!match) {
    throw createError({ status: 400, message: 'Invalid abbreviated secret format' })
  }

  const [, prefix, suffix] = match
  const newParts = parts.filter(p => !(p.startsWith(prefix) && p.endsWith(suffix)))

  if (newParts.length === parts.length) {
    throw createError({ status: 404, message: 'Secret not found' })
  }

  event.context.db.prepare(
    `UPDATE oauth2_applications SET client_secret = ? WHERE client_id = ?`
  ).bind(newParts.join(' ') || '', clientID).run()
}

export async function validateOAuth2ApplicationSecret(
  event: H3Event,
  clientID: string,
  plainSecret: string
): Promise<boolean> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.client_secret) return false

  const parts = app.client_secret.split(' ').filter(h => h)

  for (const part of parts) {
    if (/^[a-f0-9]{64}$/i.test(part)) {
      const hash = createHash('sha256').update(plainSecret).digest('hex')
      if (part === hash) return true
    } else {
      if (part === plainSecret) return true
    }
  }

  return false
}

// --- Redirect URI management using the space-separated redirect_uris column ---

export async function getOAuth2ApplicationRedirectUris(
  event: H3Event,
  clientID: string
): Promise<string[]> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.redirect_uris) return []
  return app.redirect_uris.split(' ').filter(u => u)
}

export async function addOAuth2ApplicationRedirectUri(
  event: H3Event,
  clientID: string,
  uri: string
): Promise<void> {
  const app = await getOAuth2Application(event, clientID)
  const existing = app?.redirect_uris ? app.redirect_uris.split(' ').filter(u => u) : []

  if (existing.includes(uri)) {
    throw createError({ status: 409, message: 'Redirect URI already exists' })
  }

  const newValue = [...existing, uri].join(' ')

  event.context.db.prepare(
    `UPDATE oauth2_applications SET redirect_uris = ? WHERE client_id = ?`
  ).bind(newValue, clientID).run()
}

export async function removeOAuth2ApplicationRedirectUri(
  event: H3Event,
  clientID: string,
  uri: string
): Promise<void> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.redirect_uris) {
    throw createError({ status: 404, message: 'No redirect URIs found' })
  }

  const existing = app.redirect_uris.split(' ').filter(u => u)
  const newValue = existing.filter(u => u !== uri)

  if (newValue.length === existing.length) {
    throw createError({ status: 404, message: 'Redirect URI not found' })
  }

  event.context.db.prepare(
    `UPDATE oauth2_applications SET redirect_uris = ? WHERE client_id = ?`
  ).bind(newValue.join(' ') || null, clientID).run()
}

// --- Scope management using the space-separated permissions column ---

export async function getOAuth2ApplicationScopes(
  event: H3Event,
  clientID: string
): Promise<string[]> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.permissions) return []
  return app.permissions.split(' ').filter((s) => s)
}

export async function addOAuth2ApplicationScopes(
  event: H3Event,
  clientID: string,
  scopes: string[]
): Promise<void> {
  const app = await getOAuth2Application(event, clientID)
  const existing = app?.permissions ? app.permissions.split(' ').filter((s) => s) : []
  const combined = [...existing]
  for (const s of scopes) {
    if (!combined.includes(s)) combined.push(s)
  }

  event.context.db.prepare(
    `UPDATE oauth2_applications SET permissions = ? WHERE client_id = ?`
  ).bind(combined.join(' ') || null, clientID).run()
}

export async function removeOAuth2ApplicationScope(
  event: H3Event,
  clientID: string,
  scope: string
): Promise<void> {
  const app = await getOAuth2Application(event, clientID)
  if (!app || !app.permissions) {
    throw createError({ status: 404, message: 'No scopes found' })
  }

  const existing = app.permissions.split(' ').filter((s) => s)
  const newValue = existing.filter((s) => s !== scope)

  if (newValue.length === existing.length) {
    throw createError({ status: 404, message: 'Scope not found' })
  }

  event.context.db.prepare(
    `UPDATE oauth2_applications SET permissions = ? WHERE client_id = ?`
  ).bind(newValue.join(' ') || null, clientID).run()
}

export { MAX_APPLICATIONS_PER_USER }
