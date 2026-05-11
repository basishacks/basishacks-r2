import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const entryPath = resolve('.output/server/index.mjs')
const fixedUrl = `file:///${entryPath.replace(/\\/g, '/')}`

globalThis._importMeta_ = { url: fixedUrl }

await import('./.output/server/index.mjs')