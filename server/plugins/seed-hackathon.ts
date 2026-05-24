import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import { getDatabase } from '../utils/database';

export default defineNitroPlugin(async () => {
  const db = getDatabase();

  const userColumns = (db.prepare("PRAGMA table_info('users')").all() as { name: string }[]).map(
    (c) => c.name,
  );
  for (const col of ['profile_theme', 'profile_picture']) {
    if (!userColumns.includes(col)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
    }
  }

  const columns = db.prepare("PRAGMA table_info('hackathon')").all() as { name: string }[];
  const columnNames = columns.map((c) => c.name);

  const requiredColumns = [
    'voting_enabled',
    'results_published',
    'submitted_count',
    'max_votes_per_user',
    'judging_open',
    'schedule_start',
    'schedule_end',
    'start_timestamp',
    'end_timestamp',
    'voting_start_timestamp',
    'voting_end_timestamp',
    'results_open_timestamp',
  ];

  for (const col of requiredColumns) {
    if (!columnNames.includes(col)) {
      db.exec(
        `ALTER TABLE hackathon ADD COLUMN "${col}" ${col.includes('timestamp') || col.includes('schedule') ? 'TEXT' : 'INTEGER NOT NULL DEFAULT 0'}`,
      );
    }
  }

  db.exec(`
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
  `);

  db.exec(`
    INSERT OR IGNORE INTO oauth2_applications (client_id, client_secret, permissions, redirect_uris, name, description, proxy_microsoft, type, profile_picture)
    VALUES (
      '97e435f4-17e8-42ef-9b12-9684fd656de9',
      'local-dev-secret',
      'openid profile email',
      'http://localhost:3000/api/auth',
      'basishacks connect',
      'BIBS-C Network internal OAuth2 application for hackathon login',
      0,
      'first',
      NULL
    )
  `);

  console.log('[seed-hackathon] Timestamps seeded successfully');
});
