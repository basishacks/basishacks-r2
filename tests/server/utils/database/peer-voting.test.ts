import { createMockEvent } from './helpers'
import {
  getPeerVoteByUser,
  createPeerVote,
} from '~~/server/utils/database/peer-voting'

describe('peer-voting database helpers', () => {
  let event: ReturnType<typeof createMockEvent>

  beforeEach(() => {
    event = createMockEvent()
  })

  describe('getPeerVoteByUser', () => {
    it('returns the vote when the user has one', async () => {
      event.context.db.prepare(
        'INSERT INTO peer_voting_scores(user_id, score, reasoning) VALUES(1, \'{"team1":4}\', \'Good picks\')',
      ).run()

      const vote = await getPeerVoteByUser(event, 1)
      expect(vote).not.toBeNull()
      expect(vote!.user_id).toBe(1)
      expect(vote!.score).toBe('{"team1":4}')
      expect(vote!.reasoning).toBe('Good picks')
    })

    it('returns null when the user has no vote', async () => {
      const vote = await getPeerVoteByUser(event, 1)
      expect(vote).toBeNull()
    })
  })

  describe('createPeerVote', () => {
    it('creates a peer vote successfully', async () => {
      await createPeerVote(event, 1, '{"team1":5,"team2":3}', 'Well reasoned')

      const vote = await getPeerVoteByUser(event, 1)
      expect(vote).not.toBeNull()
      expect(vote!.user_id).toBe(1)
      expect(vote!.score).toBe('{"team1":5,"team2":3}')
      expect(vote!.reasoning).toBe('Well reasoned')
    })
  })
})