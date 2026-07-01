import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  mockSession,
  seedHackathon,
  seedSeason,
  seedUser,
  type TestContext,
} from '~~/tests/api/helpers'
import { scVotes } from '~~/server/database/schema'

let ctx: TestContext
let voteHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  voteHandler = (await import('~~/server/api/election/vote/index.post')).default
})

beforeEach(() => {
  resetMockState()
  ctx = createTestContext()
  seedHackathon(ctx)
  seedSeason(ctx)
  seedUser(ctx, { email: 'voter@basischina.com' })
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

function buildVote(candidateRanks: Record<string, number | null>) {
  return {
    positions: [
      {
        title: 'President',
        candidates: Object.entries(candidateRanks).map(([id, rank]) => ({
          id,
          rank,
        })),
      },
    ],
  }
}

describe('POST /api/election/vote', () => {
  it('upserts a vote so only the latest submission is kept', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'participant' })
    mockSession.value = { user: { id: 1 } }

    mockBody.value = buildVote({ alice: 1, bob: 2 })
    await voteHandler(createEvent())

    mockBody.value = buildVote({ alice: 2, bob: 1 })
    await voteHandler(createEvent())

    const rows = ctx.drizzle.select().from(scVotes).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(1)

    const vote = JSON.parse(rows[0].vote!)
    expect(vote).toEqual({ alice: 2, bob: 1 })
  })
})
