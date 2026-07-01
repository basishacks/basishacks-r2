import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', '..', 'server', 'api', 'debug', 'upload.post.ts'),
  'utf-8',
)

describe('debug upload endpoint', () => {
  it('requires an authenticated user', () => {
    expect(source).toContain("import { requireUser } from '~~/server/utils/auth'")
    expect(source).toContain('await requireUser(event)')
  })

  it('whitelists file extensions', () => {
    expect(source).toContain('ALLOWED_EXTENSIONS')
    expect(source).toContain('File extension not allowed')
    expect(source).toContain('ALLOWED_EXTENSIONS.has(extension)')
  })
})
