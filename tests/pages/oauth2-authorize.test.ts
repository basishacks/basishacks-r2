import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'app', 'pages', 'api', 'oauth2', 'authorize.vue'),
  'utf-8',
)

describe('OAuth2 authorize page', () => {
  it('stores the canvas interval and clears it on unmount', () => {
    expect(source).toMatch(/canvasIntervalId\s*=\s*setInterval/)
    expect(source).toContain('clearInterval(canvasIntervalId)')
  })
})
