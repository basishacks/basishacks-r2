import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  mockSession,
  seedHackathon,
  seedSeason,
  type TestContext,
} from './helpers'

vi.mock('~~/server/utils/rateLimit', () => ({
  applyRateLimit: (fn: any) => fn,
}))

let ctx: TestContext
let candidatesHandler: any
let voteGetHandler: any
let votePostHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const { electionPositions } = await import('~~/server/utils/election')
  vi.stubGlobal('electionPositions', electionPositions)

  candidatesHandler = (await import('~~/server/api/election/candidates.get')).default
  voteGetHandler = (await import('~~/server/api/election/vote/index.get')).default
  votePostHandler = (await import('~~/server/api/election/vote/index.post')).default
})

beforeEach(() => {
  resetMockState()
  ctx = createTestContext()
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

describe('GET /api/election/candidates', () => {
  it('returns election positions with candidates', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'participant' })

    const result = await candidatesHandler(createEvent())

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('candidates')
  })

  it('requires VOTE permission', async () => {
    vi.mocked(globalThis.requirePermission).mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    await expect(candidatesHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('GET /api/election/vote', () => {
  it('returns IRV election results', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'participant' })

    const result = await voteGetHandler(createEvent())

    expect(result).toHaveProperty('totalBallots', 0)
    expect(result).toHaveProperty('positions')
    expect(Array.isArray(result.positions)).toBe(true)
  })
})

describe('POST /api/election/vote', () => {
  it('submits an election vote', async () => {
    ;(globalThis as any).requirePermission.mockResolvedValue({ id: 1, role: 'participant' })

    mockSession.value = { user: { id: 1 } }

    // Build a valid vote payload based on actual election positions
    const { electionPositions } = await import('~~/server/utils/election')
    const positions = electionPositions.map((pos: any) => ({
      title: pos.title,
      candidates: pos.candidates.map((c: any, i: number) => ({
        id: c.id,
        rank: i + 1,
      })),
    }))

    mockBody.value = { positions }

    const result = await votePostHandler(createEvent())

    expect(result).toEqual({ message: 'Vote submitted successfully' })
  })
})