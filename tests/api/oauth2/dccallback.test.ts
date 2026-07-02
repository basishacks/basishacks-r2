import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  resetMockState,
  setupNitroGlobals,
  mockCookies,
  mockQueryState,
} from '../helpers'

// Mock the session.post module so we can control getAuthorizeSession
// and exchangeAuthorizationCode in isolation.
vi.mock('~~/server/api/oauth2/session.post', () => ({
  getAuthorizeSession: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
}))

// Mock jose's jwtVerify so we don't need to sign a real JWT in the test.
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { user_id: 42, sub: '42' },
  }),
}))

let deleteCookieSpy: ReturnType<typeof vi.fn>
let sendRedirectSpy: ReturnType<typeof vi.fn>

let handler: any
let getAuthorizeSession: ReturnType<typeof vi.fn>
let exchangeAuthorizationCode: ReturnType<typeof vi.fn>

beforeAll(async () => {
  setupNitroGlobals()

  // Stub the remaining nitro globals used by dccallback.get.ts that
  // setupNitroGlobals does not provide.
  deleteCookieSpy = vi.fn()
  sendRedirectSpy = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('deleteCookie', deleteCookieSpy)
  vi.stubGlobal('sendRedirect', sendRedirectSpy)

  process.env.NUXT_OAUTH2_JWT_SECRET = 'test-secret-at-least-32-bytes-long'

  handler = (await import('~~/server/api/oauth2/dccallback.get')).default
  const mod = await import('~~/server/api/oauth2/session.post')
  getAuthorizeSession = mod.getAuthorizeSession as any
  exchangeAuthorizationCode = mod.exchangeAuthorizationCode as any
})

beforeEach(() => {
  resetMockState()
  deleteCookieSpy.mockClear()
  sendRedirectSpy.mockClear()
  getAuthorizeSession.mockReset()
  exchangeAuthorizationCode.mockReset()
})

const VERIFIER = 'verifier-from-cookie'
const MS_VERIFIER = 'verifier-for-microsoft-flow'

function createMockSession() {
  return {
    token: 'test-bridge-id',
    // ms_verifier is the Microsoft-flow PKCE verifier. The old buggy code
    // passed this as the code_verifier; the fix must NOT use it.
    ms_verifier: MS_VERIFIER,
    ms_state: null,
    redirect_uri: 'https://example.com/callback',
    granted_time: Date.now(),
    expire_time: Date.now() + 10 * 60 * 1000,
    application: { client_id: 'test-client-id' },
    user: { id: 42 },
    teams_code: null,
    bh_state: 'test-state',
    bh_verifier_challenge: '',
    bh_verifier_challenge_method: '',
    scopes: ['openid', 'profile'],
    post_login_redirect: null,
    login_state: 'completed',
    code: null,
  }
}

function createEvent() {
  return { context: {}, node: { req: {}, res: {} } } as any
}

describe('GET /api/oauth2/dccallback - PKCE verifier handling', () => {
  it('throws 400 when pkce_verifier cookie is missing', async () => {
    getAuthorizeSession.mockReturnValue(createMockSession())
    mockCookies.values['bridge_id'] = 'test-bridge-id'
    mockQueryState.value = { code: 'test-code', state: 'test-state' }
    // Note: no pkce_verifier cookie set

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Missing PKCE verifier cookie'),
    })

    expect(exchangeAuthorizationCode).not.toHaveBeenCalled()
    expect(deleteCookieSpy).not.toHaveBeenCalled()
  })

  it('passes the pkce_verifier cookie value (not session.ms_verifier) to exchangeAuthorizationCode', async () => {
    getAuthorizeSession.mockReturnValue(createMockSession())
    mockCookies.values['bridge_id'] = 'test-bridge-id'
    mockCookies.values['pkce_verifier'] = VERIFIER
    mockQueryState.value = { code: 'test-code', state: 'test-state' }

    exchangeAuthorizationCode.mockResolvedValue('fake-jwt-token')

    await handler(createEvent())

    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1)
    const call = exchangeAuthorizationCode.mock.calls[0]
    // Signature: exchangeAuthorizationCode(code, clientId, redirectUri, scope, codeVerifier)
    expect(call[0]).toBe('test-code')
    expect(call[1]).toBe('test-client-id')
    expect(call[2]).toBe('https://example.com/callback')
    expect(call[3]).toBe('openid profile')
    // CRITICAL regression check: the cookie value is used, not session.ms_verifier
    expect(call[4]).toBe(VERIFIER)
    expect(call[4]).not.toBe(MS_VERIFIER)
  })

  it('clears the pkce_verifier cookie after a successful exchange', async () => {
    getAuthorizeSession.mockReturnValue(createMockSession())
    mockCookies.values['bridge_id'] = 'test-bridge-id'
    mockCookies.values['pkce_verifier'] = VERIFIER
    mockQueryState.value = { code: 'test-code', state: 'test-state' }

    exchangeAuthorizationCode.mockResolvedValue('fake-jwt-token')

    await handler(createEvent())

    expect(deleteCookieSpy).toHaveBeenCalledWith(expect.anything(), 'pkce_verifier')
  })

  it('clears the bridge_id session cookie after a successful exchange', async () => {
    getAuthorizeSession.mockReturnValue(createMockSession())
    mockCookies.values['bridge_id'] = 'test-bridge-id'
    mockCookies.values['pkce_verifier'] = VERIFIER
    mockQueryState.value = { code: 'test-code', state: 'test-state' }

    exchangeAuthorizationCode.mockResolvedValue('fake-jwt-token')

    await handler(createEvent())

    expect(deleteCookieSpy).toHaveBeenCalledWith(expect.anything(), 'bridge_id')
  })

  it('does not clear the pkce_verifier cookie when the exchange fails', async () => {
    getAuthorizeSession.mockReturnValue(createMockSession())
    mockCookies.values['bridge_id'] = 'test-bridge-id'
    mockCookies.values['pkce_verifier'] = VERIFIER
    mockQueryState.value = { code: 'test-code', state: 'test-state' }

    exchangeAuthorizationCode.mockRejectedValue(new Error('Invalid code_verifier'))

    await expect(handler(createEvent())).rejects.toBeDefined()

    expect(deleteCookieSpy).not.toHaveBeenCalled()
  })
})
