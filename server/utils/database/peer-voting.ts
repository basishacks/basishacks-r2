import type { H3Event } from 'h3'

export async function getPeerVoteByUser(
  event: H3Event,
  userID: number,
): Promise<PeerVotingScore | null> {
  return event.context.db
    .prepare('SELECT * FROM peer_voting_scores WHERE user_id = ?')
    .bind(userID)
    .first() as PeerVotingScore | null
}

export async function createPeerVote(
  event: H3Event,
  userID: number,
  score: string,
  reasoning: string,
): Promise<void> {
  event.context.db
    .prepare(
      'INSERT INTO peer_voting_scores (user_id, score, reasoning) VALUES (?, ?, ?)',
    )
    .bind(userID, score, reasoning)
    .run()
}
