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
vi.stubGlobal('deleteCookie', vi.fn())

import {
  usedSensitiveScopes,
  determinePostMicrosoft,
  completeConsentFlow,
} from '~~/server/utils/oauth2-validate'

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

// ---------------------------------------------------------------------------
// determinePostMicrosoft + completeConsentFlow
// ---------------------------------------------------------------------------

import { generateExchangeCode } from '~~/server/api/oauth2/session.post'

function makeFullSession(overrides: Partial<any> = {}) {
  return {
    application: { client_id: overrides.client_id ?? 'test-client' },
    scopes: overrides.scopes ?? ['openid'],
    redirect_uri: overrides.redirect_uri ?? 'https://example.com/callback',
    bh_state: overrides.bh_state ?? 'state-value',
    bh_verifier_challenge: overrides.bh_verifier_challenge ?? 'challenge',
    bh_verifier_challenge_method: overrides.bh_verifier_challenge_method ?? 'S256',
    code: overrides.code ?? 'exchange-code',
    login_state: overrides.login_state ?? 'idle',
  } as any
}

describe('determinePostMicrosoft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(generateExchangeCode as any).mockImplementation((session: any) => {
      session.code = session.code || 'exchange-code'
    })
  })

  it('returns a consent URL with URL-encoded parameters for sensitive scopes', () => {
    const session = makeFullSession({
      scopes: ['openid', 'chat.read'],
      redirect_uri: 'https://example.com/callback?extra=1',
      bh_state: 'state with spaces',
    })

    const url = determinePostMicrosoft({}, session)

    expect(url.startsWith('/api/oauth2/authorize?')).toBe(true)
    expect(url).toContain('client_id=test-client')
    expect(url).toContain('scope=openid%20chat.read')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback%3Fextra%3D1')
    expect(url).toContain('state=state%20with%20spaces')
    expect(url).toContain('response_type=code')
    expect(url).toContain('code_challenge=challenge')
    expect(url).toContain('code_challenge_method=S256')
  })

  it('completes the consent flow when no sensitive scopes are requested', () => {
    const session = makeFullSession({ scopes: ['openid', 'profile'] })

    const url = determinePostMicrosoft({}, session)

    expect(url).toContain('https://example.com/callback?')
    expect(url).toContain('code=')
    expect(url).toContain('state=state-value')
  })
})

describe('completeConsentFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(generateExchangeCode as any).mockImplementation((session: any) => {
      session.code = 'test-code'
    })
  })

  it('uses ? when redirect_uri has no query string', () => {
    const session = makeFullSession({ redirect_uri: 'https://example.com/callback' })

    const url = completeConsentFlow({}, session)

    expect(url).toBe('https://example.com/callback?code=test-code&state=state-value')
  })

  it('uses & when redirect_uri already has a query string', () => {
    const session = makeFullSession({
      redirect_uri: 'https://example.com/callback?extra=1',
    })

    const url = completeConsentFlow({}, session)

    expect(url).toBe(
      'https://example.com/callback?extra=1&code=test-code&state=state-value',
    )
  })

  it('URL-encodes code and state values', () => {
    const session = makeFullSession({
      redirect_uri: 'https://example.com/callback',
      bh_state: 'state/with spaces',
    })
    ;(generateExchangeCode as any).mockImplementation((s: any) => {
      s.code = 'code/with spaces'
    })

    const url = completeConsentFlow({}, session)

    expect(url).toBe(
      'https://example.com/callback?code=code%2Fwith%20spaces&state=state%2Fwith%20spaces',
    )
  })
})