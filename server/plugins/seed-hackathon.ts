import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import { getDatabase } from '../utils/database'

export default defineNitroPlugin(async () => {
  const db = getDatabase()
  const columns = db.prepare("PRAGMA table_info('hackathon')").all() as { name: string }[]
  const columnNames = columns.map(c => c.name)

  const requiredColumns = [
    'start_timestamp',
    'end_timestamp',
    'voting_start_timestamp',
    'voting_end_timestamp',
    'results_open_timestamp'
  ]

  for (const col of requiredColumns) {
    if (!columnNames.includes(col)) {
      db.run(`ALTER TABLE hackathon ADD COLUMN "${col}" TEXT`)
    }
  }

  db.run(`
    INSERT INTO hackathon (
      id, status, voting_enabled, results_published, submitted_count, max_votes_per_user, judging_open,
      schedule_start, schedule_end,
      start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp
    ) VALUES (
      1, 'not_started', 0, 0, 0, 0, 0,
      '2026-05-15T11:00:00.000Z', '2026-05-22T11:00:00.000Z',
      '2026-05-15T11:00:00.000Z', '2026-05-22T11:00:00.000Z',
      '2026-05-15T11:00:00.000Z', '2026-05-22T11:00:00.000Z',
      '2026-05-22T11:00:00.000Z'
    ) ON CONFLICT(id) DO UPDATE SET
      schedule_start = excluded.schedule_start,
      schedule_end = excluded.schedule_end,
      start_timestamp = excluded.start_timestamp,
      end_timestamp = excluded.end_timestamp,
      voting_start_timestamp = excluded.voting_start_timestamp,
      voting_end_timestamp = excluded.voting_end_timestamp,
      results_open_timestamp = excluded.results_open_timestamp
  `)

  console.log('[seed-hackathon] Timestamps seeded successfully')
})