import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  seedHackathon,
  seedSeason,
  seedUser,
  type TestContext,
} from '~~/tests/api/helpers'

let ctx: TestContext
let deleteHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const oauthDb = await import('~~/server/utils/database/oauth2_applications')
  vi.stubGlobal('deleteOAuth2Applications', oauthDb.deleteOAuth2Applications)

  deleteHandler = (await import('~~/server/api/applications/index.delete')).default
})

beforeEach(() => {
    resetMockState()
    ctx = createTestContext()
    seedHackathon(ctx)
    seedSeason(ctx)
    seedUser(ctx, { email: 'dev@basischina.com' })
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

describe('DELETE /api/applications', () => {
  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(globalThis.requirePermission).mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
    )

    mockBody.value = { ids: ['some-client-id'] }

    await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('deletes applications when the caller has permission', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'admin' })

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