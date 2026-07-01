import { createMockEvent } from './helpers'
import {
  createOAuth2Application,
  getOAuth2Application,
  getAllOAuth2Applications,
  deleteOAuth2Applications,
  addOAuth2ApplicationSecret,
  getOAuth2ApplicationSecretAbbreviated,
  validateOAuth2ApplicationSecret,
  removeOAuth2ApplicationSecret,
  getOAuth2ApplicationRedirectUris,
  addOAuth2ApplicationRedirectUri,
  removeOAuth2ApplicationRedirectUri,
  getOAuth2ApplicationScopes,
  addOAuth2ApplicationScopes,
  removeOAuth2ApplicationScope,
} from '~~/server/utils/database/oauth2_applications'

describe('oauth2_applications database helpers', () => {
  let event: Awaited<ReturnType<typeof createMockEvent>>

  beforeEach(async () => {
    event = await createMockEvent()
    // Seed a user for the owner_id foreign key
    event.context.db.prepare(
      "INSERT INTO users(email) VALUES('owner@example.com')",
    ).run()
  })

  describe('createOAuth2Application', () => {
    it('creates an application with all fields', async () => {
      const app = await createOAuth2Application(
        event,
        1,
        'My App',
        'A test app',
        true,
        'first',
      )

      expect(app).not.toBeNull()
      expect(app.client_id).toBeDefined()
      expect(app.client_id.length).toBeGreaterThan(0)
      expect(app.name).toBe('My App')
      expect(app.description).toBe('A test app')
      expect(app.proxy_microsoft).toBe(1)
      expect(app.type).toBe('first')
      expect(app.owner_id).toBe(1)
      expect(app.client_secret).toBe('')
    })

    it('defaults the type to third when not specified', async () => {
      const app = await createOAuth2Application(
        event,
        1,
        'Third Party App',
        null,
        false,
      )

      expect(app.type).toBe('third')
    })
  })

  describe('getOAuth2Application', () => {
    it('returns the application when it exists', async () => {
      const created = await createOAuth2Application(
        event,
        1,
        'Test App',
        null,
        false,
      )

      const app = await getOAuth2Application(event, created.client_id)
      expect(app).not.toBeNull()
      expect(app!.name).toBe('Test App')
    })

    it('returns null when the application does not exist', async () => {
      const app = await getOAuth2Application(event, 'nonexistent-id')
      expect(app).toBeNull()
    })
  })

  describe('getAllOAuth2Applications', () => {
    it('returns all applications', async () => {
      await createOAuth2Application(event, 1, 'App A', null, false)
      await createOAuth2Application(event, 1, 'App B', null, false)

      const apps = await getAllOAuth2Applications(event)
      expect(apps).toHaveLength(2)
      expect(apps.map((a) => a.name)).toEqual(['App A', 'App B'])
    })

    it('returns an empty array when there are no applications', async () => {
      const apps = await getAllOAuth2Applications(event)
      expect(apps).toHaveLength(0)
    })
  })

  describe('deleteOAuth2Applications', () => {
    it('deletes a single application', async () => {
      const app = await createOAuth2Application(event, 1, 'App', null, false)

      await deleteOAuth2Applications(event, [app.client_id])

      const found = await getOAuth2Application(event, app.client_id)
      expect(found).toBeNull()
    })

    it('deletes multiple applications', async () => {
      const appA = await createOAuth2Application(event, 1, 'App A', null, false)
      const appB = await createOAuth2Application(event, 1, 'App B', null, false)
      const appC = await createOAuth2Application(event, 1, 'App C', null, false)

      await deleteOAuth2Applications(event, [appA.client_id, appC.client_id])

      expect(await getOAuth2Application(event, appA.client_id)).toBeNull()
      expect(await getOAuth2Application(event, appB.client_id)).not.toBeNull()
      expect(await getOAuth2Application(event, appC.client_id)).toBeNull()
    })
  })

  describe('secret management', () => {
    let clientId: string

    beforeEach(async () => {
      const app = await createOAuth2Application(event, 1, 'Secret App', null, false)
      clientId = app.client_id
    })

    it('adds a secret and returns the plain text version', async () => {
      const { plainSecret } = await addOAuth2ApplicationSecret(event, clientId)
      expect(plainSecret).toBeDefined()
      expect(plainSecret.length).toBe(64) // 32 bytes hex = 64 chars
    })

    it('gets abbreviated secrets', async () => {
      await addOAuth2ApplicationSecret(event, clientId)

      const abbreviated = await getOAuth2ApplicationSecretAbbreviated(
        event,
        clientId,
      )
      expect(abbreviated).toHaveLength(1)
      expect(abbreviated[0]).toMatch(/^sha256:[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/)
    })

    it('validates a correct secret', async () => {
      const { plainSecret } = await addOAuth2ApplicationSecret(event, clientId)

      const valid = await validateOAuth2ApplicationSecret(
        event,
        clientId,
        plainSecret,
      )
      expect(valid).toBe(true)
    })

    it('rejects an incorrect secret', async () => {
      await addOAuth2ApplicationSecret(event, clientId)

      const valid = await validateOAuth2ApplicationSecret(
        event,
        clientId,
        'wrong-secret-value',
      )
      expect(valid).toBe(false)
    })

    it('removes a secret by its abbreviated form', async () => {
      await addOAuth2ApplicationSecret(event, clientId)
      const abbreviated = await getOAuth2ApplicationSecretAbbreviated(
        event,
        clientId,
      )

      await removeOAuth2ApplicationSecret(event, clientId, abbreviated[0]!)

      const remaining = await getOAuth2ApplicationSecretAbbreviated(
        event,
        clientId,
      )
      expect(remaining).toHaveLength(0)
    })

    it('throws when removing a secret with an invalid abbreviated format', async () => {
      await addOAuth2ApplicationSecret(event, clientId)

      await expect(
        removeOAuth2ApplicationSecret(event, clientId, 'bad-format'),
      ).rejects.toThrow('Invalid abbreviated secret format')
    })

    it('keeps both secrets when two are added concurrently', async () => {
      const [first, second] = await Promise.all([
        addOAuth2ApplicationSecret(event, clientId),
        addOAuth2ApplicationSecret(event, clientId),
      ])

      const abbreviated = await getOAuth2ApplicationSecretAbbreviated(
        event,
        clientId,
      )
      expect(abbreviated).toHaveLength(2)
      expect(
        await validateOAuth2ApplicationSecret(event, clientId, first.plainSecret),
      ).toBe(true)
      expect(
        await validateOAuth2ApplicationSecret(event, clientId, second.plainSecret),
      ).toBe(true)
    })
  })

  describe('redirect URI management', () => {
    let clientId: string

    beforeEach(async () => {
      const app = await createOAuth2Application(event, 1, 'URI App', null, false)
      clientId = app.client_id
    })

    it('adds a redirect URI', async () => {
      await addOAuth2ApplicationRedirectUri(
        event,
        clientId,
        'https://example.com/callback',
      )

      const uris = await getOAuth2ApplicationRedirectUris(event, clientId)
      expect(uris).toHaveLength(1)
      expect(uris[0]).toBe('https://example.com/callback')
    })

    it('gets all redirect URIs', async () => {
      await addOAuth2ApplicationRedirectUri(event, clientId, 'https://a.com/cb')
      await addOAuth2ApplicationRedirectUri(event, clientId, 'https://b.com/cb')

      const uris = await getOAuth2ApplicationRedirectUris(event, clientId)
      expect(uris).toHaveLength(2)
    })

    it('throws when adding a duplicate redirect URI', async () => {
      await addOAuth2ApplicationRedirectUri(event, clientId, 'https://a.com/cb')

      await expect(
        addOAuth2ApplicationRedirectUri(event, clientId, 'https://a.com/cb'),
      ).rejects.toThrow('Redirect URI already exists')
    })

    it('removes a redirect URI', async () => {
      await addOAuth2ApplicationRedirectUri(event, clientId, 'https://a.com/cb')
      await addOAuth2ApplicationRedirectUri(event, clientId, 'https://b.com/cb')

      await removeOAuth2ApplicationRedirectUri(
        event,
        clientId,
        'https://a.com/cb',
      )

      const uris = await getOAuth2ApplicationRedirectUris(event, clientId)
      expect(uris).toHaveLength(1)
      expect(uris[0]).toBe('https://b.com/cb')
    })

    it('throws when removing a non-existing redirect URI', async () => {
      await expect(
        removeOAuth2ApplicationRedirectUri(
          event,
          clientId,
          'https://nonexistent.com/cb',
        ),
      ).rejects.toThrow('No redirect URIs found')
    })

    it('keeps both redirect URIs when two are added concurrently', async () => {
      await Promise.all([
        addOAuth2ApplicationRedirectUri(event, clientId, 'https://a.com/cb'),
        addOAuth2ApplicationRedirectUri(event, clientId, 'https://b.com/cb'),
      ])

      const uris = await getOAuth2ApplicationRedirectUris(event, clientId)
      expect(uris).toHaveLength(2)
      expect(uris).toContain('https://a.com/cb')
      expect(uris).toContain('https://b.com/cb')
    })
  })

  describe('scope management', () => {
    let clientId: string

    beforeEach(async () => {
      const app = await createOAuth2Application(event, 1, 'Scope App', null, false)
      clientId = app.client_id
    })

    it('adds scopes to an application', async () => {
      await addOAuth2ApplicationScopes(event, clientId, ['read', 'write'])

      const scopes = await getOAuth2ApplicationScopes(event, clientId)
      expect(scopes).toHaveLength(2)
      expect(scopes).toContain('read')
      expect(scopes).toContain('write')
    })

    it('gets all scopes for an application', async () => {
      await addOAuth2ApplicationScopes(event, clientId, ['scope1'])
      await addOAuth2ApplicationScopes(event, clientId, ['scope2'])

      const scopes = await getOAuth2ApplicationScopes(event, clientId)
      expect(scopes).toHaveLength(2)
    })

    it('removes a scope from an application', async () => {
      await addOAuth2ApplicationScopes(event, clientId, ['read', 'write'])

      await removeOAuth2ApplicationScope(event, clientId, 'read')

      const scopes = await getOAuth2ApplicationScopes(event, clientId)
      expect(scopes).toHaveLength(1)
      expect(scopes[0]).toBe('write')
    })

    it('throws when removing a non-existing scope', async () => {
      await expect(
        removeOAuth2ApplicationScope(event, clientId, 'nonexistent'),
      ).rejects.toThrow('No scopes found')
    })

    it('keeps both scopes when two batches are added concurrently', async () => {
      await Promise.all([
        addOAuth2ApplicationScopes(event, clientId, ['read']),
        addOAuth2ApplicationScopes(event, clientId, ['write']),
      ])

      const scopes = await getOAuth2ApplicationScopes(event, clientId)
      expect(scopes).toHaveLength(2)
      expect(scopes).toContain('read')
      expect(scopes).toContain('write')
    })
  })
})