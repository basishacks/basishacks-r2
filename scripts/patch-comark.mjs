/**
 * Postinstall patch for @comark/vue on Windows.
 *
 * Bug: @comark/vue v0.3.1 uses fileURLToPath() to compute runtimeDir,
 * which produces backslash paths on Windows. The path is then used in
 * Vue compiler import statements without normalization, causing
 * "Invalid escape sequence" parse errors during build.
 *
 * Fix: Add .replace(/\\/g, '/') to the runtimeDir usage on the line
 * that constructs the import path — matching the pattern already used
 * in generateComponentsModule() in the same file.
 *
 * Upstream issue: https://github.com/comarkdown/comark
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const vitePath = join(
  import.meta.dirname ?? new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  '..',
  'node_modules',
  '@comark',
  'vue',
  'dist',
  'vite.js',
)

try {
  let content = readFileSync(vitePath, 'utf8')

  const target = "path: `${runtimeDir}/${context.ssr ? 'ssrSlot' : 'slot'}`"
  const replacement =
    "path: `${runtimeDir.replace(/\\\\/g, '/')}/${context.ssr ? 'ssrSlot' : 'slot'}`"

  if (content.includes(target)) {
    content = content.replace(target, replacement)
    writeFileSync(vitePath, content, 'utf8')
    console.log('[patch-comark] Fixed Windows backslash paths in @comark/vue/dist/vite.js')
  } else if (content.includes(replacement)) {
    console.log('[patch-comark] Patch already applied')
  } else {
    console.warn('[patch-comark] Could not find target string — @comark/vue may have been updated')
  }
} catch (err) {
  console.warn('[patch-comark] Could not patch @comark/vue:', err.message)
}
