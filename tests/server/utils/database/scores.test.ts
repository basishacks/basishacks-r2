import { createMockEvent } from './helpers'
import {
  createTeamScores,
  getTeamScoresByTeamID,
} from '~~/server/utils/database/scores'

describe('scores database helpers', () => {
  let event: ReturnType<typeof createMockEvent>

  beforeEach(() => {
    event = createMockEvent()
    // Seed hackathon
    event.context.db.prepare(
      "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
    ).run()
    // Seed season and team
    event.context.db.prepare(
      "INSERT INTO seasons(name, is_active) VALUES('S1', 1)",
    ).run()
    event.context.db.prepare(
      "INSERT INTO teams(name, season_id) VALUES('Team A', 1)",
    ).run()
    // Seed a judge user
    event.context.db.prepare(
      "INSERT INTO users(email, role) VALUES('judge@example.com', 'judge')",
    ).run()
  })

  describe('createTeamScores', () => {
    it('creates team scores and returns them with the season_id', async () => {
      const scores = await createTeamScores(event, {
        team_id: 1,
        judge_user_id: 1,
        scores: '{"innovation":5,"impact":4}',
        reasoning: 'Great project overall',
      })

      expect(scores).not.toBeNull()
      expect(scores.team_id).toBe(1)
      expect(scores.judge_user_id).toBe(1)
      expect(scores.scores).toBe('{"innovation":5,"impact":4}')
      expect(scores.reasoning).toBe('Great project overall')
      expect(scores.season_id).toBe(1)
    })
  })

  describe('getTeamScoresByTeamID', () => {
    it('returns scores for a team that has them', async () => {
      event.context.db.prepare(
        'INSERT INTO team_scores(team_id, judge_user_id, scores, reasoning) VALUES(1, 1, \'{"innovation":3}\', \'Decent\')',
      ).run()

      const scores = await getTeamScoresByTeamID(event, 1)
      expect(scores).toHaveLength(1)
      expect(scores[0]!.team_id).toBe(1)
      expect(scores[0]!.judge_user_id).toBe(1)
    })

    it('returns an empty array when the team has no scores', async () => {
      const scores = await getTeamScoresByTeamID(event, 1)
      expect(scores).toHaveLength(0)
    })
  })
})