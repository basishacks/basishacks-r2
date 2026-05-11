import { resolve } from 'node:path'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { Database } from 'bun:sqlite'

const projectRoot = resolve('.')
const dbDir = resolve(projectRoot, 'database')
mkdirSync(dbDir, { recursive: true })

const db = new Database(resolve(dbDir, 'basishacks.sqlite'), { create: true })
db.run('PRAGMA journal_mode = WAL')
db.run('PRAGMA foreign_keys = ON')

const initSqlPath = resolve(projectRoot, 'sql/init.sql')
if (existsSync(initSqlPath)) {
  const sql = readFileSync(initSqlPath, 'utf8')
  db.exec(sql)
  console.log('[start-fix] Executed sql/init.sql')
} else {
  console.warn('[start-fix] sql/init.sql not found – creating minimal tables')
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS hackathon (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'not_started',
      voting_enabled INTEGER NOT NULL DEFAULT 0,
      results_published INTEGER NOT NULL DEFAULT 0,
      submitted_count INTEGER NOT NULL DEFAULT 0,
      max_votes_per_user INTEGER NOT NULL DEFAULT 0,
      judging_open INTEGER NOT NULL DEFAULT 0,
      schedule_start TEXT,
      schedule_end TEXT
    );
  `)
}


const missingColumns = [
  'start_timestamp',
  'end_timestamp',
  'voting_start_timestamp',
  'voting_end_timestamp',
  'results_open_timestamp'
]

const existingCols = new Set(
  db.query("PRAGMA table_info('hackathon')").all().map(c => c.name)
)

for (const col of missingColumns) {
  if (!existingCols.has(col)) {
    try {
      db.run(`ALTER TABLE hackathon ADD COLUMN "${col}" TEXT`)
      console.log(`[start-fix] Added column ${col}`)
    } catch (e) {
        
    }
  }
}

const seedDates = {
  schedule_start: '2026-05-23T00:00:00.000Z',
  schedule_end: '2026-05-30T00:00:00.000Z',
  start_timestamp: '2026-05-23T00:00:00.000Z',
  end_timestamp: '2026-05-30T00:00:00.000Z',
  voting_start_timestamp: '2026-05-23T00:00:00.000Z',
  voting_end_timestamp: '2026-05-30T00:00:00.000Z',
  results_open_timestamp: '2026-05-30T00:00:00.000Z'
}

db.run(`DELETE FROM hackathon WHERE id = 1`)
db.run(
  `INSERT INTO hackathon (id, status, voting_enabled, results_published, submitted_count, max_votes_per_user, judging_open, schedule_start, schedule_end, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(
    1, 'not_started',
    0, 0, 0, 0, 0,
    $schedule_start, $schedule_end,
    $start_timestamp, $end_timestamp,
    $voting_start_timestamp, $voting_end_timestamp,
    $results_open_timestamp
  )`,
  seedDates
)

const entryPath = resolve(projectRoot, '.output/server/index.mjs')
globalThis._importMeta_ = { url: `file:///${entryPath.replace(/\\/g, '/')}` }

await import('./.output/server/index.mjs')