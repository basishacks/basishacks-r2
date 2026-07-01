import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  mockCookies,
  mockConfig,
  seedHackathon,
  seedUser,
  seedSeason,
  type TestContext,
} from '../helpers'
import { clearRateLimitHistory, applyRateLimit } from '~~/server/utils/rateLimit'

vi.mock('~~/server/api/oauth2/session.post', () => ({
  getAuthorizeSession: vi.fn(),
  completeAuthorizeSession: vi.fn(),
  generateExchangeCode: vi.fn(),
}))

vi.mock('~~/server/utils/oauth2-validate', () => ({
  usedSensitiveScopes: vi.fn(),
  determinePostMicrosoft: vi.fn(),
}))

let ctx: TestContext
let codeHandler: any
let loginHandler: any

beforeAll(async () => {
  setupNitroGlobals()
  // Use the real rate limit wrapper for these tests
  vi.stubGlobal('applyRateLimit', applyRateLimit)

  const { getUser } = await import('~~/server/utils/database/users')
  vi.stubGlobal('getUser', getUser)

  // Bypass the per-user code cooldown so we can test endpoint-level rate limiting
  vi.stubGlobal('addCodeToUser', vi.fn().mockResolvedValue({
    id: 1,
    email: 'test@basischina.com',
    login_code: '123456',
  }))
  vi.stubGlobal('updateUserName', vi.fn().mockResolvedValue(undefined))
  vi.stubGlobal('getUserByCode', vi.fn().mockResolvedValue({ id: 1 }))

  codeHandler = (await import('~~/server/api/auth/code.post')).default
  loginHandler = (await import('~~/server/api/auth/login.post')).default
})

beforeEach(async () => {
  resetMockState()
  clearRateLimitHistory()
  ctx = await createTestContext()
  seedHackathon(ctx)
  seedSeason(ctx)
})

afterEach(() => {
  resetTestContext(ctx)
})

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    context: { db: ctx.db, drizzle: ctx.drizzle },
    node: {
      req: {
        socket: {
          remoteAddress: '10.0.0.1',
        },
      },
    },
    ...overrides,
  }
}

describe('POST /api/auth/code rate limiting', () => {
  it('allows 3 requests per email per minute then returns 429', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'idle' })

    const { usedSensitiveScopes } = await import('~~/server/utils/oauth2-validate')
    ;(usedSensitiveScopes as any).mockReturnValue(false)

    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    mockCookies.values['bridge_id'] = 'valid-token'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, name: 'Test User' }),
    }))

    mockBody.value = { email: 'limit@basischina.com' }

    for (let i = 0; i < 3; i++) {
      await expect(codeHandler(createEvent())).resolves.toBeDefined()
    }

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('falls back to IP when no email is provided', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'idle' })

    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    mockCookies.values['bridge_id'] = 'valid-token'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, name: 'Test User' }),
    }))

    mockBody.value = {}

    for (let i = 0; i < 3; i++) {
      // The handler fails because email is missing, but the request is still
      // counted by the rate limiter.
      await expect(codeHandler(createEvent())).rejects.toBeDefined()
    }

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})

describe('POST /api/auth/login rate limiting', () => {
  it('allows 5 requests per email per minute then returns 429', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'requesting', scopes: [] })

    const { usedSensitiveScopes } = await import('~~/server/utils/oauth2-validate')
    ;(usedSensitiveScopes as any).mockReturnValue(false)

    seedUser(ctx, {
      email: 'login@basischina.com',
      login_code: '111111',
      login_expiry: Date.now() + 10 * 60 * 1000,
      name: 'Test User',
    })

    mockCookies.values['bridge_id'] = 'valid-token'
    mockBody.value = { email: 'login@basischina.com', code: [1, 1, 1, 1, 1, 1] }

    for (let i = 0; i < 5; i++) {
      await expect(loginHandler(createEvent())).resolves.toBeDefined()
    }

    await expect(loginHandler(createEvent())).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})
