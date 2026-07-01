import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockQueryState,
  seedHackathon,
  seedSeason,
  seedUser,
  seedTeam,
  type TestContext,
} from './helpers'

let ctx: TestContext
let scoresHandler: any
let teamsHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const seasonsDb = await import('~~/server/utils/database/seasons')
  vi.stubGlobal('getActiveSeason', seasonsDb.getActiveSeason)

  const teamsDb = await import('~~/server/utils/database/teams')
  vi.stubGlobal('getAllTeams', teamsDb.getAllTeams)
  vi.stubGlobal('getTeam', teamsDb.getTeam)
  vi.stubGlobal('updateTeam', teamsDb.updateTeam)

  const scoresDb = await import('~~/server/utils/database/scores')
  vi.stubGlobal('getTeamScoresByTeamID', scoresDb.getTeamScoresByTeamID)

  const awardsDb = await import('~~/server/utils/database/awards')
  vi.stubGlobal('getAwardsForTeams', awardsDb.getAwardsForTeams)

  const { convertTeamToPublic } = await import('~~/server/utils/convert')
  vi.stubGlobal('convertTeamToPublic', convertTeamToPublic)

  scoresHandler = (await import('~~/server/api/admin/scores.get')).default
  teamsHandler = (await import('~~/server/api/admin/teams.get')).default
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

function gRequireAdmin() {
  return vi.mocked(globalThis.requireAdmin)
}

function gRequirePermission() {
  return vi.mocked(globalThis.requirePermission)
}

describe('GET /api/admin/scores', () => {
  it('requires admin role', async () => {
    gRequireAdmin().mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    await expect(scoresHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns teams with computed scores and rankings', async () => {
    gRequireAdmin().mockResolvedValue({ id: 1, role: 'admin' })

    seedTeam(ctx, {
      name: 'Alpha Team',
      pathway: 'junior',
      project_submitted: 1,
    })
    seedTeam(ctx, {
      name: 'Beta Team',
      pathway: 'senior',
      project_submitted: 1,
    })

    const result = await scoresHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('updates scores when update query is set', async () => {
    gRequireAdmin().mockResolvedValue({ id: 1, role: 'admin' })

    seedTeam(ctx, {
      name: 'Team',
      pathway: 'junior',
      project_submitted: 1,
    })

    mockQueryState.value = { update: 'true' }

    const result = await scoresHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
  })
})

describe('GET /api/admin/teams', () => {
  it('requires TEAMS permission', async () => {
    gRequirePermission().mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    await expect(teamsHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns all teams with season names', async () => {
    gRequirePermission().mockResolvedValue({ id: 1, role: 'admin' })

    seedTeam(ctx, { name: 'Team A' })
    seedTeam(ctx, { name: 'Team B' })

    const result = await teamsHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('name', 'Team A')
    expect(result[0]).toHaveProperty('season_name', 'Season 1')
    expect(result[1]).toHaveProperty('name', 'Team B')
  })
})