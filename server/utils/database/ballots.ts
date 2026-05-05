import type { H3Event } from 'h3'

export async function createBallot(event: H3Event, userID: number): Promise<Ballot> {
  return (event.context.db.prepare(
    'INSERT INTO ballots(user_id) VALUES(?) RETURNING *',
  )
    .bind(userID)
    .first() as Ballot)!
}

export async function getBallotByUser(event: H3Event, userID: number): Promise<Ballot | null> {
  return event.context.db.prepare(
    'SELECT * FROM ballots WHERE user_id = ?',
  )
    .bind(userID)
    .first() as Ballot | null
}

export async function updateBallot(event: H3Event, ballot: Ballot): Promise<void> {
  event.context.db.prepare(
    'UPDATE ballots SET reasoning = ?, submitted = ? WHERE id = ?',
  )
    .bind(ballot.reasoning, ballot.submitted, ballot.id)
    .run()
}

export async function createBallotScore(
  event: H3Event,
  ballotID: number,
  projectID: number,
): Promise<BallotScore> {
  return (event.context.db.prepare(
    'INSERT INTO ballot_scores(ballot_id, project_id) VALUES(?, ?) RETURNING *',
  )
    .bind(ballotID, projectID)
    .first() as BallotScore)!
}

export async function getBallotScores(event: H3Event, ballotID: number): Promise<BallotScore[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM ballot_scores WHERE ballot_id = ?',
    )
      .bind(ballotID)
      .all() as { results: BallotScore[] }
  ).results
}

export async function getBallotScoresByTeamID(event: H3Event, teamID: number): Promise<BallotScore[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM ballot_scores WHERE project_id = ?',
    )
      .bind(teamID)
      .all() as { results: BallotScore[] }
  ).results
}

export async function updateBallotScore(event: H3Event, score: BallotScore) {
  event.context.db.prepare(
    'UPDATE ballot_scores SET score = ? WHERE id = ?',
  )
    .bind(score.score, score.id)
    .run()
}
