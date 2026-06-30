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
  seedTeam,
  type TestContext,
} from './helpers'
import { eq, and } from 'drizzle-orm'
import { teamScores } from '~~/server/database/schema'

let ctx: TestContext
let scoresHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  const hackathonDb = await import('~~/server/utils/database/hackathon')
  vi.stubGlobal('getHackathon', hackathonDb.getHackathon)

  const scoresDb = await import('~~/server/utils/database/scores')
  vi.stubGlobal('createTeamScores', scoresDb.createTeamScores)

  scoresHandler = (await import('~~/server/api/teams/[id]/scores/index.post')).default
})

beforeEach(() => {
  resetMockState()
  ctx = createTestContext()
  seedHackathon(ctx)
  seedSeason(ctx)
  // Seed a judge user for FK constraints
  seedUser(ctx, { email: 'judge@basischina.com', role: 'judge' })
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

describe('POST /api/teams/:id/scores', () => {
  it('submits judge scores for a team', async () => {
    vi.mocked(globalThis.requireJudge).mockResolvedValue({ id: 1, role: 'judge' })

    const team = seedTeam(ctx, { name: 'Target Team', project_submitted: 1, pathway: 'junior' })

    mockParams.values['id'] = String(team.id)
    mockBody.value = {
      scores: {
        originality: 4,
        presentation: 3,
        technicality: 5,
        theme: 2,
        impact: 4,
      },
      reasoning: 'Well-built project with clear presentation.',
    }

    const result = await scoresHandler(createEvent())

    expect(result).toEqual({ message: 'Successfully scored project' })

    const score = ctx.drizzle
      .select()
      .from(teamScores)
      .where(
        and(
          eq(teamScores.team_id, team.id),
          eq(teamScores.judge_user_id, 1),
        ),
      )
      .get()
    expect(score).toBeTruthy()
    expect(score!.reasoning).toBe('Well-built project with clear presentation.')
  })

  it('returns 409 when judge has already scored this team', async () => {
    ;(globalThis as any).requireJudge.mockResolvedValue({ id: 1, role: 'judge' })

    const team = seedTeam(ctx, { name: 'Target Team', project_submitted: 1, pathway: 'junior' })

    // Pre-seed a score
    ctx.drizzle
      .insert(teamScores)
      .values({
        team_id: team.id,
        judge_user_id: 1,
        scores: '{}',
        reasoning: 'Already scored',
      })
      .run()

    mockParams.values['id'] = String(team.id)
    mockBody.value = {
      scores: {
        originality: 3,
        presentation: 3,
        technicality: 3,
        theme: 3,
        impact: 3,
      },
      reasoning: 'Trying to score again.',
    }

    await expect(scoresHandler(createEvent())).rejects.toMatchObject({ statusCode: 409 })
  })
})