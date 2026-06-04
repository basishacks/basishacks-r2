import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs'
import { spawn } from 'node:child_process'

const FILES = [
  { path: 'server/utils/database.ts', backup: 'server/utils/database.ts.bak' },
  { path: 'nuxt.config.ts', backup: 'nuxt.config.ts.bak' }
]

let restored = false

function restore() {
  if (restored) return
  restored = true
  for (const file of FILES) {
    try {
      copyFileSync(file.backup, file.path)
      unlinkSync(file.backup)
    } catch {
      // backup may not exist
    }
  }
  console.log('[build-bun] Restored patched files')
}

// 1. Backup originals
for (const file of FILES) {
  copyFileSync(file.path, file.backup)
}

// Ensure restoration on any exit path
process.on('SIGINT', () => { restore(); process.exit(130) })
process.on('SIGTERM', () => { restore(); process.exit(143) })
process.on('exit', restore)

try {
  // 2. Patch database.ts for bun:sqlite
  let dbContent = readFileSync(FILES[0].path, 'utf-8')

  dbContent = dbContent.replace(
    /import Database from ['"]better-sqlite3['"]/,
    `import { Database } from 'bun:sqlite'`
  )
  dbContent = dbContent.replace(
    /import type \{ Statement \} from ['"]better-sqlite3['"]/,
    `import type { Statement } from 'bun:sqlite'`
  )
  dbContent = dbContent.replace(
    /dbInstance\.pragma\(['"](.+)['"]\)/g,
    `dbInstance.run('PRAGMA $1')`
  )

  writeFileSync(FILES[0].path, dbContent)
  console.log('[build-bun] Patched database.ts for bun:sqlite')

  // 3. Patch nuxt.config.ts to enable trace
  let configContent = readFileSync(FILES[1].path, 'utf-8')
  configContent = configContent.replace(
    /trace:\s*false/,
    'trace: true'
  )

  writeFileSync(FILES[1].path, configContent)
  console.log('[build-bun] Patched nuxt.config.ts (trace: true)')

  // 4. Run the build with spawn so signal handling is reliable
  const child = spawn('bun', ['run', 'build'], {
    stdio: 'inherit',
    shell: false
  })

  child.on('close', (code) => {
    restore()
    process.exit(code ?? 0)
  })

  child.on('error', (err) => {
    console.error('[build-bun] Failed to start build:', err)
    restore()
    process.exit(1)
  })
} catch (err) {
  console.error('[build-bun] Build failed:', err)
  restore()
  process.exit(1)
}
