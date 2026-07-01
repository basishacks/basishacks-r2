import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { ballots, ballotScores } from '~~/server/database/schema'

export async function createBallot(event: H3Event, userID: number): Promise<Ballot> {
  return event.context.drizzle
    .insert(ballots)
    .values({ user_id: userID })
    .returning()
    .get()!
}

export async function getBallotByUser(event: H3Event, userID: number): Promise<Ballot | null> {
  const row = event.context.drizzle
    .select()
    .from(ballots)
    .where(eq(ballots.user_id, userID))
    .get()

  return row ?? null
}

export async function updateBallot(event: H3Event, ballot: Ballot): Promise<void> {
  const result = event.context.drizzle
    .update(ballots)
    .set({ reasoning: ballot.reasoning, submitted: ballot.submitted })
    .where(eq(ballots.id, ballot.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'Ballot not found',
    })
  }
}

export async function createBallotScore(
  event: H3Event,
  ballotID: number,
  projectID: number,
): Promise<BallotScore> {
  return event.context.drizzle
    .insert(ballotScores)
    .values({ ballot_id: ballotID, project_id: projectID })
    .returning()
    .get()!
}

export async function getBallotScores(event: H3Event, ballotID: number): Promise<BallotScore[]> {
  return event.context.drizzle
    .select()
    .from(ballotScores)
    .where(eq(ballotScores.ballot_id, ballotID))
    .all()
}

export async function getBallotScoresByTeamID(event: H3Event, teamID: number): Promise<BallotScore[]> {
  return event.context.drizzle
    .select()
    .from(ballotScores)
    .where(eq(ballotScores.project_id, teamID))
    .all()
}

export async function updateBallotScore(event: H3Event, score: BallotScore) {
  const result = event.context.drizzle
    .update(ballotScores)
    .set({ score: score.score })
    .where(eq(ballotScores.id, score.id))
    .run()

  if (result.changes === 0) {
    throw createError({
      status: 404,
      message: 'Ballot score not found',
    })
  }
}