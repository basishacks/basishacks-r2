import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILES = [
  { path: 'server/utils/database.ts', backup: 'server/utils/database.ts.bak' },
  { path: 'nuxt.config.ts', backup: 'nuxt.config.ts.bak' },
];

// 1. Backup originals
for (const file of FILES) {
  copyFileSync(file.path, file.backup);
}

try {
  // 2. Patch database.ts for bun:sqlite
  let dbContent = readFileSync(FILES[0].path, 'utf-8');

  dbContent = dbContent.replace(
    /import Database from ['"]better-sqlite3['"]/,
    `import { Database } from 'bun:sqlite'`,
  );
  dbContent = dbContent.replace(
    /import type \{ Statement \} from ['"]better-sqlite3['"]/,
    `import type { Statement } from 'bun:sqlite'`,
  );
  dbContent = dbContent.replace(
    /dbInstance\.pragma\(['"](.+)['"]\)/g,
    `dbInstance.run('PRAGMA $1')`,
  );

  writeFileSync(FILES[0].path, dbContent);
  console.log('[build-bun] Patched database.ts for bun:sqlite');

  // 3. Patch nuxt.config.ts to enable trace
  let configContent = readFileSync(FILES[1].path, 'utf-8');
  configContent = configContent.replace(/trace:\s*false/, 'trace: true');

  writeFileSync(FILES[1].path, configContent);
  console.log('[build-bun] Patched nuxt.config.ts (trace: true)');

  // 4. Run the build
  execSync('bun run build', { stdio: 'inherit' });
} catch (err) {
  console.error('[build-bun] Build failed:', err);
  process.exit(1);
} finally {
  // 5. Always restore originals
  for (const file of FILES) {
    copyFileSync(file.backup, file.path);
    unlinkSync(file.backup);
  }
  console.log('[build-bun] Restored patched files');
}
