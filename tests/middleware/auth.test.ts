import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'app', 'middleware', 'auth.ts'),
  'utf-8',
)

describe('auth middleware', () => {
  it('preserves the requested path in the login redirect', () => {
    expect(source).toContain('(to) =>')
    expect(source).toContain('to.fullPath')
    expect(source).toContain('encodeURIComponent(to.fullPath)')
  })
})
