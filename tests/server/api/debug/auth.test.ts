import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filesSource = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', '..', 'server', 'api', 'debug', 'files.get.ts'),
  'utf-8',
)
const sessionSource = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', '..', 'server', 'api', 'debug', 'deepseek', 'sessions', '[id]', 'index.get.ts'),
  'utf-8',
)

describe('debug endpoints are protected', () => {
  it('files.get.ts requires permission', () => {
    expect(filesSource).toContain('requirePermission')
    expect(filesSource).toContain('DevPermissions.PORTAL_DEBUG_VIEW')
  })

  it('deepseek session get requires permission', () => {
    expect(sessionSource).toContain('requirePermission')
    expect(sessionSource).toContain('DevPermissions.PORTAL_DEEPSEEK_VIEW')
  })
})
