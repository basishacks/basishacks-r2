import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'

const DB_FILE = 'server/utils/database.ts'
const BACKUP = 'server/utils/database.ts.bak'

// 1. Backup original
copyFileSync(DB_FILE, BACKUP)

try {
  // 2. Patch for bun:sqlite
  let content = readFileSync(DB_FILE, 'utf-8')

  // Swap imports
  content = content.replace(
    /import Database from ['"]better-sqlite3['"]/,
    `import { Database } from 'bun:sqlite'`
  )
  content = content.replace(
    /import type \{ Statement \} from ['"]better-sqlite3['"]/,
    `import type { Statement } from 'bun:sqlite'`
  )

  // Swap pragma() for run()
  content = content.replace(
    /dbInstance\.pragma\(['"](.+)['"]\)/g,
    `dbInstance.run('PRAGMA $1')`
  )

  writeFileSync(DB_FILE, content)
  console.log('[build-bun] Patched database.ts for bun:sqlite')

  // 3. Run the build
  execSync('bun run build', { stdio: 'inherit' })
} catch (err) {
  console.error('[build-bun] Build failed:', err)
  process.exit(1)
} finally {
  // 4. Always restore original
  copyFileSync(BACKUP, DB_FILE)
  unlinkSync(BACKUP)
  console.log('[build-bun] Restored database.ts')
}