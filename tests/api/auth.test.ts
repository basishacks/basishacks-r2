import {
  createTestContext,
  resetTestContext,
  resetMockState,
  setupNitroGlobals,
  mockBody,
  mockCookies,
  mockSession,
  mockConfig,
  seedHackathon,
  seedUser,
  seedSeason,
  type TestContext,
} from './helpers'
import { eq } from 'drizzle-orm'
import { users } from '~~/server/database/schema'

// Mock the auth utility module
vi.mock('~~/server/utils/auth', () => ({
  requireUser: vi.fn(),
  requireJudge: vi.fn(),
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
}))

// Mock the rate limit wrapper
vi.mock('~~/server/utils/rateLimit', () => ({
  applyRateLimit: (fn: any) => fn,
}))

// Mock the OAuth2 session module
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
let loginHandler: any
let codeHandler: any
let impersonateHandler: any

beforeAll(async () => {
  setupNitroGlobals()

  // Stub auto-imported database functions using real implementations
  const { addCodeToUser, getUserByEmail, getUserByCode, getUser, updateUserName } = await import('~~/server/utils/database/users')
  vi.stubGlobal('addCodeToUser', addCodeToUser)
  vi.stubGlobal('getUserByEmail', getUserByEmail)
  vi.stubGlobal('getUserByCode', getUserByCode)
  vi.stubGlobal('getUser', getUser)
  vi.stubGlobal('updateUserName', updateUserName)

  // Import handlers after globals are set up
  loginHandler = (await import('~~/server/api/auth/login.post')).default
  codeHandler = (await import('~~/server/api/auth/code.post')).default
  impersonateHandler = (await import('~~/server/api/auth/impersonate.post')).default
})

beforeEach(() => {
  resetMockState()
  ctx = createTestContext()
  seedHackathon(ctx)
  seedSeason(ctx)
})

afterEach(() => {
  resetTestContext(ctx)
})

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    context: { db: ctx.db, drizzle: ctx.drizzle },
    ...overrides,
  }
}

describe('POST /api/auth/code', () => {
  it('returns 400 when bridge_id cookie is missing', async () => {
    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    mockBody.value = { email: 'test@basischina.com' }
    // no cookie set

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when session is expired', async () => {
    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue(null)

    mockBody.value = { email: 'test@basischina.com' }
    mockCookies.values['bridge_id'] = 'expired-token'

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 500 when sendCodeURL is not configured', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'idle' })

    mockConfig.value = {}
    mockBody.value = { email: 'test@basischina.com' }
    mockCookies.values['bridge_id'] = 'valid-token'

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('generates a login code and stores it for the user', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'idle' })

    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    mockBody.value = { email: 'test@basischina.com' }
    mockCookies.values['bridge_id'] = 'valid-token'

    // Mock the fetch call to sendCodeURL
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, name: 'Test User' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await codeHandler(createEvent())

    expect(result).toHaveProperty('message', 'Sent code to your Teams account')

    // Verify the user was created with a login code
    const user = ctx.drizzle
      .select()
      .from(users)
      .where(eq(users.email, 'test@basischina.com'))
      .get()
    expect(user).toBeTruthy()
    expect(user!.login_code).toBeTruthy()
    expect(user!.login_code).toMatch(/^\d{6}$/)
  })

  it('rate-limits repeated code requests', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'idle' })

    mockConfig.value = { sendCodeURL: 'https://example.com/send' }
    mockBody.value = { email: 'test@basischina.com' }
    mockCookies.values['bridge_id'] = 'valid-token'

    // Seed a user who already has a recent code
    seedUser(ctx, {
      email: 'test@basischina.com',
      login_code: '123456',
      login_expiry: Date.now() + 9 * 60 * 1000 + 1000, // not yet 1 minute old
    })

    await expect(codeHandler(createEvent())).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})

describe('POST /api/auth/login', () => {
  it('returns 400 when bridge_id cookie is missing', async () => {
    mockBody.value = { email: 'test@basischina.com', code: [1, 2, 3, 4, 5, 6] }

    await expect(loginHandler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when session is expired', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue(null)

    mockBody.value = { email: 'test@basischina.com', code: [1, 2, 3, 4, 5, 6] }
    mockCookies.values['bridge_id'] = 'expired-token'

    await expect(loginHandler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 for invalid email/code combination', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'requesting' })

    const { usedSensitiveScopes } = await import('~~/server/utils/oauth2-validate')
    ;(usedSensitiveScopes as any).mockReturnValue(false)

    mockBody.value = { email: 'nobody@basischina.com', code: [1, 2, 3, 4, 5, 6] }
    mockCookies.values['bridge_id'] = 'valid-token'

    await expect(loginHandler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns user data on successful login', async () => {
    const { getAuthorizeSession } = await import('~~/server/api/oauth2/session.post')
    ;(getAuthorizeSession as any).mockReturnValue({ login_state: 'requesting' })

    const { usedSensitiveScopes } = await import('~~/server/utils/oauth2-validate')
    ;(usedSensitiveScopes as any).mockReturnValue(false)

    // Seed a user with a known code
    seedUser(ctx, {
      email: 'test@basischina.com',
      login_code: '999999',
      login_expiry: Date.now() + 10 * 60 * 1000,
      name: 'Test User',
    })

    mockBody.value = { email: 'test@basischina.com', code: [9, 9, 9, 9, 9, 9] }
    mockCookies.values['bridge_id'] = 'valid-token'

    const result = await loginHandler(createEvent())

    expect(result).toHaveProperty('user')
    expect(result.user).toMatchObject({
      email: 'test@basischina.com',
      name: 'Test User',
    })
    expect(result).toHaveProperty('sensitive', false)
    expect(result).toHaveProperty('time')
  })
})

describe('POST /api/auth/impersonate', () => {
  it('returns 403 when user is not admin', async () => {
    const { requireAdmin } = await import('~~/server/utils/auth')
    ;(requireAdmin as any).mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), { statusCode: 403 }),
    )

    mockBody.value = { userId: 1 }

    await expect(impersonateHandler(createEvent())).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 404 when target user does not exist', async () => {
    const { requireAdmin } = await import('~~/server/utils/auth')
    ;(requireAdmin as any).mockResolvedValue({ id: 1, role: 'admin' })

    mockBody.value = { userId: 9999 }

    await expect(impersonateHandler(createEvent())).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('sets session to target user on successful impersonation', async () => {
    const { requireAdmin } = await import('~~/server/utils/auth')
    ;(requireAdmin as any).mockResolvedValue({ id: 1, role: 'admin' })

    const target = seedUser(ctx, {
      email: 'target@basischina.com',
      name: 'Target User',
    })

    mockBody.value = { userId: target.id }

    const result = await impersonateHandler(createEvent())

    expect(result).toEqual({ success: true })
    expect(mockSession.value).toMatchObject({ user: { id: target.id } })
  })
})