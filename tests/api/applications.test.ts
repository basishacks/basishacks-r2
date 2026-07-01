import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  mockParams,
  seedHackathon,
  seedSeason,
  seedUser,
  type TestContext,
} from './helpers'

let ctx: TestContext
let listHandler: any
let createHandler: any
let deleteHandler: any
let getHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const oauthDb = await import('~~/server/utils/database/oauth2_applications')
  vi.stubGlobal('getOAuth2Application', oauthDb.getOAuth2Application)
  vi.stubGlobal('createOAuth2Application', oauthDb.createOAuth2Application)
  vi.stubGlobal('deleteOAuth2Applications', oauthDb.deleteOAuth2Applications)
  vi.stubGlobal('getOAuth2ApplicationCountByOwner', oauthDb.getOAuth2ApplicationCountByOwner)

  listHandler = (await import('~~/server/api/applications/index.get')).default
  createHandler = (await import('~~/server/api/applications/index.post')).default
  deleteHandler = (await import('~~/server/api/applications/index.delete')).default
  getHandler = (await import('~~/server/api/applications/[id]/index.get')).default
})

beforeEach(async () => {
  resetMockState()
  ctx = await createTestContext()
  seedHackathon(ctx)
  seedSeason(ctx)
})

afterEach(() => {
  resetTestContext(ctx)
})

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    context: { db: ctx.db, drizzle: ctx.drizzle },
    ...overrides,
  }
}

describe('GET /api/applications', () => {
  it('requires PORTAL_APPLICATIONS_VIEW permission', async () => {
    vi.mocked(globalThis.requirePermission).mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    await expect(listHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns all applications', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'admin' })

    const result = await listHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
  })
})

describe('POST /api/applications', () => {
  it('creates a new OAuth2 application', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'admin' })

    seedUser(ctx, { email: 'dev@basischina.com', name: 'Developer' })

    mockBody.value = {
      name: 'My App',
      description: 'A test application',
      proxy_microsoft: false,
    }

    const result = await createHandler(createEvent())

    expect(result).toHaveProperty('client_id')
    expect(result).toHaveProperty('client_secret')
    expect(result).toHaveProperty('name', 'My App')
  })

  it('rate-limits applications per user', async () => {
    ;(globalThis as any).requirePermission.mockResolvedValue({ id: 1, role: 'admin' })

    seedUser(ctx, { email: 'dev@basischina.com', name: 'Developer' })

    // Create MAX_APPLICATIONS_PER_USER apps
    for (let i = 0; i < 5; i++) {
      await import('~~/server/utils/database/oauth2_applications').then((m) =>
        m.createOAuth2Application(
          { context: { drizzle: ctx.drizzle } } as any,
          1,
          `App ${i}`,
          null,
          false,
          'third',
        ),
      )
    }

    mockBody.value = {
      name: 'One Too Many',
      description: 'Should fail',
      proxy_microsoft: false,
    }

    await expect(createHandler(createEvent())).rejects.toMatchObject({ statusCode: 429 })
  })
})

describe('GET /api/applications/:id', () => {
  it('returns 404 for non-existing application', async () => {
    ;(globalThis as any).requireUser.mockResolvedValue({ id: 1, role: 'admin' })

    mockParams.values['id'] = 'nonexistent'

    await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('DELETE /api/applications', () => {
  it('deletes applications by client IDs', async () => {
    ;(globalThis as any).requirePermission.mockResolvedValue({ id: 1, role: 'admin' })

    seedUser(ctx, { email: 'dev@basischina.com' })

    // Create an app first
    const oauthDb = await import('~~/server/utils/database/oauth2_applications')
    const app = await oauthDb.createOAuth2Application(
      { context: { drizzle: ctx.drizzle } } as any,
      1,
      'Test App',
      null,
      false,
      'third',
    )

    mockBody.value = { ids: [app.client_id] }

    const result = await deleteHandler(createEvent())

    expect(result).toEqual({ message: 'Deleted 1 application(s)' })
  })
})