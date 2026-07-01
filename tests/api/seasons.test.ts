import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  seedHackathon,
  seedSeason,
  type TestContext,
} from './helpers'

let ctx: TestContext
let listHandler: any
let activeGetHandler: any
let activePatchHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const seasonsDb = await import('~~/server/utils/database/seasons')
  vi.stubGlobal('getSeasons', seasonsDb.getSeasons)
  vi.stubGlobal('getActiveSeason', seasonsDb.getActiveSeason)
  vi.stubGlobal('setActiveSeason', seasonsDb.setActiveSeason)

  const hackathonDb = await import('~~/server/utils/database/hackathon')
  vi.stubGlobal('getHackathon', hackathonDb.getHackathon)

  listHandler = (await import('~~/server/api/seasons/index.get')).default
  activeGetHandler = (await import('~~/server/api/seasons/active.get')).default
  activePatchHandler = (await import('~~/server/api/seasons/active.patch')).default
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

describe('GET /api/seasons', () => {
  it('requires PORTAL_SEASONS_VIEW permission', async () => {
    vi.mocked(globalThis.requirePermission).mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    await expect(listHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns all seasons', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'admin' })

    seedSeason(ctx, { name: 'Season 2', is_active: 0 })

    const result = await listHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('name', 'Season 1')
    expect(result[1]).toHaveProperty('name', 'Season 2')
  })
})

describe('GET /api/seasons/active', () => {
  it('returns active season with hackathon metadata', async () => {
    const result = await activeGetHandler(createEvent())

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name', 'Season 1')
    expect(result).toHaveProperty('status', 'in_progress')
    expect(result).toHaveProperty('theme_name', 'Test Theme')
  })

  it('returns 404 when no hackathon exists', async () => {
    resetTestContext(ctx)
    // No hackathon row seeded

    await expect(activeGetHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('PATCH /api/seasons/active', () => {
  it('requires PORTAL_SEASONS_EDIT permission', async () => {
    vi.mocked(globalThis.requirePermission).mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    mockBody.value = { season_id: 1 }

    await expect(activePatchHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('sets the active season', async () => {
    ;(globalThis as any).requirePermission.mockResolvedValue({ id: 1, role: 'admin' })

    const s2 = seedSeason(ctx, { name: 'Season 2', is_active: 0 })

    mockBody.value = { season_id: s2.id }

    const result = await activePatchHandler(createEvent())

    expect(result).toEqual({ message: 'Active season updated' })
  })
})