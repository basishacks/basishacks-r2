import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestDatabase } from '~~/tests/setup'
import { migrateDatabase } from '~~/server/database/migrate'

describe('migrateDatabase', () => {
  it('applies an ALTER-only migration instead of skipping it', async () => {
    const wrapper = await createTestDatabase()
    const rawDb = wrapper.getRawDb()

    // Create a temp migrations directory with an ALTER-only migration
    const migrationsDir = mkdtempSync(join(tmpdir(), 'basishacks-migrations-'))
    writeFileSync(
      join(migrationsDir, '0001_test_alter_only.sql'),
      'ALTER TABLE users ADD COLUMN migrate_test_col INTEGER;',
    )

    try {
      migrateDatabase(rawDb, migrationsDir)

      const rows = rawDb
        .prepare("SELECT name FROM pragma_table_info('users') WHERE name = ?")
        .all('migrate_test_col') as any[]
      expect(rows.length).toBe(1)

      // Running again should be idempotent (recorded in _drizzle_migrations)
      migrateDatabase(rawDb, migrationsDir)
      const recorded = rawDb
        .prepare('SELECT COUNT(*) AS count FROM _drizzle_migrations')
        .get() as { count: number }
      expect(recorded.count).toBe(1)
    } finally {
      rmSync(migrationsDir, { recursive: true, force: true })
      wrapper.close()
    }
  })
})
