import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { peerVotingScores } from '~~/server/database/schema'

export async function getPeerVoteByUser(
  event: H3Event,
  userID: number,
): Promise<PeerVotingScore | null> {
  const row = event.context.drizzle
    .select()
    .from(peerVotingScores)
    .where(eq(peerVotingScores.user_id, userID))
    .get()

  return row ?? null
}

export async function upsertPeerVote(
  event: H3Event,
  vote: { user_id: number; score: string; reasoning: string },
): Promise<void> {
  event.context.drizzle
    .insert(peerVotingScores)
    .values(vote)
    .onConflictDoUpdate({
      target: peerVotingScores.user_id,
      set: {
        score: vote.score,
        reasoning: vote.reasoning,
      },
    })
    .run()
}