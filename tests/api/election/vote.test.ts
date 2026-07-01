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
} from '../helpers'

let ctx: TestContext
let votePostHandler: any

beforeAll(async () => {
  setupNitroGlobals()
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

async function buildValidPositions() {
  const { electionPositions } = await import('~~/server/utils/election')
  return electionPositions.map((pos: any) => ({
    title: pos.title,
    candidates: pos.candidates.map((c: any, i: number) => ({
      id: c.id,
      rank: i + 1,
    })),
  }))
}

describe('POST /api/election/vote', () => {
  it('upserts duplicate votes instead of creating duplicates', async () => {
    vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: 'participant' })
    mockSession.value = { user: { id: 1 } }

    const positions = await buildValidPositions()
    mockBody.value = { positions }

    await votePostHandler(createEvent())

    const newPositions = positions.map((pos: any) => ({
      ...pos,
      candidates: pos.candidates
        .map((c: any) => c.rank)
        .sort((a: number, b: number) => b - a)
        .map((rank: number, i: number) => ({ ...pos.candidates[i], rank })),
    }))
    mockBody.value = { positions: newPositions }

    await votePostHandler(createEvent())

    const rows = ctx.drizzle.select().from((await import('~~/server/database/schema')).scVotes).all()
    expect(rows).toHaveLength(1)
    expect(JSON.parse(rows[0].vote ?? '{}')).toEqual(
      Object.fromEntries(
        newPositions.flatMap((pos: any) =>
          pos.candidates.map((c: any) => [c.id, c.rank]),
        ),
      ),
    )
  })
})
