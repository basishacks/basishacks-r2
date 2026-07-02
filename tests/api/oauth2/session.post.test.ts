import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createHash } from 'crypto'
import type { AuthorizeSession } from '~~/server/api/oauth2/session.post'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('setCookie', vi.fn())
vi.stubGlobal('createError', (err: any) => {
  const e = new Error(err.message || 'Error') as any
  e.statusCode = err.statusCode || err.status || 500
  throw e
})

let addAuthorizeSession: typeof import('~~/server/api/oauth2/session.post').addAuthorizeSession
let completeAuthorizeSession: typeof import('~~/server/api/oauth2/session.post').completeAuthorizeSession
let exchangeAuthorizationCode: typeof import('~~/server/api/oauth2/session.post').exchangeAuthorizationCode
let generateExchangeCode: typeof import('~~/server/api/oauth2/session.post').generateExchangeCode

beforeAll(async () => {
  process.env.NUXT_OAUTH2_JWT_SECRET = 'super-secret-key-at-least-32-bytes-long'

  const mod = await import('~~/server/api/oauth2/session.post')
  addAuthorizeSession = mod.addAuthorizeSession
  completeAuthorizeSession = mod.completeAuthorizeSession
  exchangeAuthorizationCode = mod.exchangeAuthorizationCode
  generateExchangeCode = mod.generateExchangeCode
})

const createdTokens: string[] = []

afterEach(() => {
  for (const token of createdTokens) {
    completeAuthorizeSession(token)
  }
  createdTokens.length = 0
})

function createSession(overrides: Partial<AuthorizeSession> = {}): AuthorizeSession {
  const token = `test-token-${Math.random().toString(36).slice(2)}`
  const session: AuthorizeSession = {
    token,
    ms_verifier: null,
    ms_state: null,
    redirect_uri: 'https://example.com/callback',
    granted_time: Date.now(),
    expire_time: Date.now() + 10 * 60 * 1000,
    application: {
      client_id: 'test-client',
      client_secret: 'secret',
      name: 'Test App',
      permissions: '',
      redirect_uris: '',
      proxy_microsoft: 0,
      type: 'confidential',
    } as any,
    user: { id: 1 } as any,
    teams_code: null,
    bh_state: 'state',
    bh_verifier_challenge: '',
    bh_verifier_challenge_method: '',
    scopes: ['openid'],
    login_state: 'completed',
    code: null,
    ...overrides,
  }
  addAuthorizeSession(session)
  createdTokens.push(session.token)
  return session
}

describe('exchangeAuthorizationCode', () => {
  it('exchanges a valid code for a JWT', async () => {
    const session = createSession()
    generateExchangeCode(session)

    const jwt = await exchangeAuthorizationCode(session.code!)

    expect(typeof jwt).toBe('string')
    expect(jwt.length).toBeGreaterThan(0)
  })

  it('invalidates the code before signing so concurrent exchanges yield one success', async () => {
    const session = createSession()
    generateExchangeCode(session)
    const code = session.code!

    const results = await Promise.allSettled([
      exchangeAuthorizationCode(code),
      exchangeAuthorizationCode(code),
    ])

    const successes = results.filter((r) => r.status === 'fulfilled')
    const failures = results.filter((r) => r.status === 'rejected')

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
  })

  it('rejects a previously used code', async () => {
    const session = createSession()
    generateExchangeCode(session)
    const code = session.code!

    await exchangeAuthorizationCode(code)

    await expect(exchangeAuthorizationCode(code)).rejects.toThrow('Invalid authorization code')
  })
})

describe('exchangeAuthorizationCode PKCE verification', () => {
  const verifier = 'my-secret-pkce-verifier-value'

  function s256Challenge(v: string): string {
    return createHash('sha256').update(v).digest('base64url')
  }

  it('succeeds with correct code_verifier using S256', async () => {
    const session = createSession({
      bh_verifier_challenge: s256Challenge(verifier),
      bh_verifier_challenge_method: 'S256',
    })
    generateExchangeCode(session)

    const jwt = await exchangeAuthorizationCode(session.code!, undefined, undefined, undefined, verifier)

    expect(typeof jwt).toBe('string')
    expect(jwt.length).toBeGreaterThan(0)
  })

  it('rejects wrong code_verifier using S256', async () => {
    const session = createSession({
      bh_verifier_challenge: s256Challenge(verifier),
      bh_verifier_challenge_method: 'S256',
    })
    generateExchangeCode(session)

    await expect(
      exchangeAuthorizationCode(session.code!, undefined, undefined, undefined, 'wrong-verifier'),
    ).rejects.toThrow('Invalid code_verifier')
  })

  it('rejects missing code_verifier when PKCE challenge is set', async () => {
    const session = createSession({
      bh_verifier_challenge: s256Challenge(verifier),
      bh_verifier_challenge_method: 'S256',
    })
    generateExchangeCode(session)

    await expect(
      exchangeAuthorizationCode(session.code!),
    ).rejects.toThrow('code_verifier is required for PKCE')
  })

  it('succeeds with correct code_verifier using plain method', async () => {
    const session = createSession({
      bh_verifier_challenge: verifier,
      bh_verifier_challenge_method: 'plain',
    })
    generateExchangeCode(session)

    const jwt = await exchangeAuthorizationCode(session.code!, undefined, undefined, undefined, verifier)

    expect(typeof jwt).toBe('string')
    expect(jwt.length).toBeGreaterThan(0)
  })

  it('rejects wrong code_verifier using plain method', async () => {
    const session = createSession({
      bh_verifier_challenge: verifier,
      bh_verifier_challenge_method: 'plain',
    })
    generateExchangeCode(session)

    await expect(
      exchangeAuthorizationCode(session.code!, undefined, undefined, undefined, 'wrong-verifier'),
    ).rejects.toThrow('Invalid code_verifier')
  })

  it('skips PKCE check when no challenge was stored (non-PKCE flow)', async () => {
    const session = createSession({
      bh_verifier_challenge: '',
      bh_verifier_challenge_method: '',
    })
    generateExchangeCode(session)

    const jwt = await exchangeAuthorizationCode(session.code!)

    expect(typeof jwt).toBe('string')
    expect(jwt.length).toBeGreaterThan(0)
  })

  it('still invalidates the code synchronously even with PKCE mismatch', async () => {
    const session = createSession({
      bh_verifier_challenge: s256Challenge(verifier),
      bh_verifier_challenge_method: 'S256',
    })
    generateExchangeCode(session)
    const code = session.code!

    await expect(
      exchangeAuthorizationCode(code, undefined, undefined, undefined, 'wrong'),
    ).rejects.toThrow()

    // Code must already be invalidated — a second attempt should not succeed
    await expect(
      exchangeAuthorizationCode(code, undefined, undefined, undefined, verifier),
    ).rejects.toThrow('Invalid authorization code')
  })
})
