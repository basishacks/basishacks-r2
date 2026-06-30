// Setup Nitro globals before importing anything that imports server/api files
// Use vi.mock (hoisted) since ESM static imports are also hoisted
vi.mock('~~/server/api/oauth2/session.post', () => ({
  addAuthorizeSession: vi.fn(),
  getAuthorizeSession: vi.fn(),
  completeAuthorizeSession: vi.fn(),
  generateExchangeCode: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
  constructSession: vi.fn(),
  removeIfSessionExpired: vi.fn(),
  attachAuthorizeSessionCookie: vi.fn(),
}))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (input: any) => {
  const err = new Error(input.message || input.statusMessage || 'Error')
  ;(err as any).statusCode = input.statusCode ?? input.status ?? 500
  ;(err as any).statusMessage = input.statusMessage
  ;(err as any).data = input.data
  return err
})
vi.stubGlobal('readValidatedBody', vi.fn())
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('getCookie', vi.fn())
vi.stubGlobal('setCookie', vi.fn())

import { usedSensitiveScopes } from '~~/server/utils/oauth2-validate'

// ---------------------------------------------------------------------------
// usedSensitiveScopes
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<{ scopes: string[]; client_id: string }> = {}) {
  return {
    scopes: overrides.scopes ?? [],
    application: {
      client_id: overrides.client_id ?? 'test-client',
    },
  } as any
}

describe('usedSensitiveScopes', () => {
  it('returns true when session contains a sensitive scope', () => {
    // "meetings.read.all" is marked as sensitive in shared/oauth2-scopes.ts
    const session = makeSession({ scopes: ['openid', 'meetings.read.all'] })

    expect(usedSensitiveScopes(session)).toBe(true)
  })

  it('returns true when session has multiple scopes including a sensitive one', () => {
    const session = makeSession({
      scopes: ['openid', 'profile', 'chat.read'],
    })

    // "chat.read" is sensitive
    expect(usedSensitiveScopes(session)).toBe(true)
  })

  it('returns false when session has only non-sensitive scopes', () => {
    const session = makeSession({ scopes: ['openid', 'profile', 'email'] })

    expect(usedSensitiveScopes(session)).toBe(false)
  })

  it('returns false when session has empty scopes array', () => {
    const session = makeSession({ scopes: [] })

    expect(usedSensitiveScopes(session)).toBe(false)
  })

  it('returns false when session has a single non-sensitive scope', () => {
    const session = makeSession({ scopes: ['openid'] })

    expect(usedSensitiveScopes(session)).toBe(false)
  })

  it('returns false for "meetings.read.application" which is not sensitive', () => {
    const session = makeSession({ scopes: ['meetings.read.application'] })

    expect(usedSensitiveScopes(session)).toBe(false)
  })

  it('returns false for "meetings.readwrite.application" which is not sensitive', () => {
    const session = makeSession({ scopes: ['meetings.readwrite.application'] })

    expect(usedSensitiveScopes(session)).toBe(false)
  })

  it('returns true for "meetings.readwrite.all" which is sensitive', () => {
    const session = makeSession({ scopes: ['meetings.readwrite.all'] })

    expect(usedSensitiveScopes(session)).toBe(true)
  })
})