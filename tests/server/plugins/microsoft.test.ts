import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

const TOKEN_PREFIX = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6'
const ACCESS_TOKEN = TOKEN_PREFIX + 'access-token-value'
const REFRESH_TOKEN = TOKEN_PREFIX + 'refresh-token-value'

describe('microsoft token logging', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let originalFetch: typeof globalThis.fetch

  beforeAll(() => {
    process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret'
    process.env.MICROSOFT_DUMMY_USER_NAME = 'test-user@basischina.com'
    process.env.MICROSOFT_DUMMY_USER_PASSWORD = 'test-password'

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    originalFetch = globalThis.fetch
  })

  afterAll(() => {
    consoleSpy.mockRestore()
    globalThis.fetch = originalFetch
  })

  it('initializeMSAccessToken does not log the access token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
      }),
    } as unknown as Response)

    // Dynamic import gives a fresh module reference and avoids top-level side effects.
    const { default: initializeMSAccessToken } = await import('~~/server/plugins/microsoft.ts')

    await initializeMSAccessToken()

    const tokenLogCalls = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes(ACCESS_TOKEN) || call[0].includes(REFRESH_TOKEN)),
    )
    expect(tokenLogCalls).toHaveLength(0)
  })

  it('initializeDummyUserAccessToken does not log tokens when response succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
      }),
    } as unknown as Response)

    const { initializeDummyUserAccessToken } = await import('~~/server/plugins/microsoft.ts')

    await initializeDummyUserAccessToken()

    const tokenLogCalls = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes(ACCESS_TOKEN) || call[0].includes(REFRESH_TOKEN)),
    )
    expect(tokenLogCalls).toHaveLength(0)
  })

  it('initializeDummyUserAccessToken does not throw when tokens are missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Authentication failed',
      }),
    } as unknown as Response)

    const { initializeDummyUserAccessToken } = await import('~~/server/plugins/microsoft.ts')

    await expect(initializeDummyUserAccessToken()).resolves.toBeUndefined()
  })
})

describe('microsoft token request encoding', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('encodes client_credentials client_secret containing special characters', async () => {
    const specialSecret = '&=+%#'
    process.env.MICROSOFT_CLIENT_SECRET = specialSecret

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ access_token: 'token' }),
    } as unknown as Response)
    globalThis.fetch = fetchMock

    const { default: initializeMSAccessToken } = await import('~~/server/plugins/microsoft.ts')
    await initializeMSAccessToken()

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string)
    expect(body.get('client_secret')).toBe(specialSecret)
    expect(fetchMock.mock.calls[0][1].body).not.toContain('client_secret=&=+%#')
  })

  it('encodes ROPC client_secret and password containing special characters', async () => {
    const specialSecret = '&=+%#'
    const specialPassword = 'p@ss&w=ord+#'
    process.env.MICROSOFT_CLIENT_SECRET = specialSecret
    process.env.MICROSOFT_DUMMY_USER_PASSWORD = specialPassword

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ access_token: 'token', refresh_token: 'refresh' }),
    } as unknown as Response)
    globalThis.fetch = fetchMock

    const { initializeDummyUserAccessToken } = await import('~~/server/plugins/microsoft.ts')
    await initializeDummyUserAccessToken()

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string)
    expect(body.get('client_secret')).toBe(specialSecret)
    expect(body.get('password')).toBe(specialPassword)
  })
})
