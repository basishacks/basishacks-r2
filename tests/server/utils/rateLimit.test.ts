import { getClientIdentifier, applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG, clearRateLimitHistory } from '~~/server/utils/rateLimit'

// ---------------------------------------------------------------------------
// Global mocks for Nitro auto-imports
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks()
})

function makeMockEvent(overrides: Record<string, any> = {}) {
  return {
    path: '/api/test',
    method: 'GET',
    headers: {} as Record<string, string>,
    context: {},
    node: {
      req: {
        socket: {
          remoteAddress: '10.0.0.1',
        },
      },
    },
    ...overrides,
  } as any
}

// ---------------------------------------------------------------------------
// getClientIdentifier
// ---------------------------------------------------------------------------

describe('getClientIdentifier', () => {
  it('returns user-prefixed identifier when session has a user id', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({
      user: { id: 42 },
    })

    const event = makeMockEvent()
    const id = await getClientIdentifier(event)

    expect(id).toBe('user:42')
  })

  it('prefers the direct socket peer address for unauthenticated requests', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn().mockReturnValue(undefined)

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: '192.168.1.1' } } },
    })
    const id = await getClientIdentifier(event)

    expect(id).toBe('ip:192.168.1.1')
  })

  it('falls back to x-real-ip when no socket address is available', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn((_event: any, name: string) => {
      if (name === 'x-real-ip') return '5.6.7.8'
      return undefined
    })

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: undefined } } },
    })
    const id = await getClientIdentifier(event)

    expect(id).toBe('ip:5.6.7.8')
  })

  it('returns "ip:unknown" when no IP source is present', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn().mockReturnValue(undefined)

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: undefined } } },
    })
    const id = await getClientIdentifier(event)

    expect(id).toBe('ip:unknown')
  })

  it('ignores x-forwarded-for when TRUST_PROXY is not set', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn((_event: any, name: string) => {
      if (name === 'x-forwarded-for') return '10.0.0.1, 10.0.0.2'
      return undefined
    })
    delete process.env.TRUST_PROXY

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: undefined } } },
    })
    const id = await getClientIdentifier(event)

    expect(id).toBe('ip:unknown')
  })

  it('uses the rightmost x-forwarded-for value when TRUST_PROXY is set', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn((_event: any, name: string) => {
      if (name === 'x-forwarded-for') return '10.0.0.1, 10.0.0.2, 10.0.0.3'
      return undefined
    })
    process.env.TRUST_PROXY = 'true'

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: undefined } } },
    })
    const id = await getClientIdentifier(event)

    expect(id).toBe('ip:10.0.0.3')
  })

  it('rotation of x-forwarded-for does not bypass the limiter', async () => {
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    let forwarded = '10.0.0.1, 10.0.0.2'
    ;(globalThis as any).getHeader = vi.fn((_event: any, name: string) => {
      if (name === 'x-forwarded-for') return forwarded
      return undefined
    })
    delete process.env.TRUST_PROXY

    const event = makeMockEvent({
      node: { req: { socket: { remoteAddress: '192.168.1.1' } } },
    })

    const id1 = await getClientIdentifier(event)
    forwarded = '10.0.0.2, 10.0.0.1'
    const id2 = await getClientIdentifier(event)

    expect(id1).toBe('ip:192.168.1.1')
    expect(id2).toBe('ip:192.168.1.1')
    expect(id1).toBe(id2)
  })
})

// ---------------------------------------------------------------------------
// applyRateLimit
// ---------------------------------------------------------------------------

describe('applyRateLimit', () => {
  beforeEach(() => {
    // Clear rate limit history between tests to prevent state leakage
    clearRateLimitHistory()

    // Provide global mocks needed by applyRateLimit
    ;(globalThis as any).createError = (input: any) => {
      const err = new Error(input.message || input.statusMessage || 'Error')
      ;(err as any).statusCode = input.statusCode ?? input.status ?? 500
      ;(err as any).statusMessage = input.statusMessage
      ;(err as any).data = input.data
      return err
    }
    ;(globalThis as any).setHeader = vi.fn()
    ;(globalThis as any).getUserSession = vi.fn().mockResolvedValue({})
    ;(globalThis as any).getHeader = vi.fn().mockReturnValue('10.0.0.1')
  })

  it('calls the handler when under the rate limit', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler)

    const event = makeMockEvent()
    const result = await wrapped(event)

    expect(result).toEqual({ ok: true })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('allows exactly maxRequests calls before blocking', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler, { maxRequests: 3, windowMs: 60_000 })

    const event = makeMockEvent()

    // First 3 calls should succeed
    await wrapped(event)
    await wrapped(event)
    await wrapped(event)

    expect(handler).toHaveBeenCalledTimes(3)

    // 4th call should throw 429
    await expect(wrapped(event)).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('returns 429 with Retry-After header when limit is exceeded', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler, { maxRequests: 1, windowMs: 60_000 })

    const event = makeMockEvent()

    // First call succeeds
    await wrapped(event)

    // Second call should fail with 429
    await expect(wrapped(event)).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })

    expect((globalThis as any).setHeader).toHaveBeenCalledWith(
      event,
      'Retry-After',
      expect.any(Number),
    )
  })

  it('includes retryAfter and resetTime in the error data', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler, { maxRequests: 1, windowMs: 60_000 })

    const event = makeMockEvent()

    await wrapped(event)

    try {
      await wrapped(event)
      // Should not reach here
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode).toBe(429)
      expect(err.data).toBeDefined()
      expect(err.data.retryAfter).toBeGreaterThan(0)
      expect(err.data.resetTime).toBeDefined()
      expect(err.data.message).toContain('Rate limit exceeded')
    }
  })

  it('respects custom maxRequests and windowMs config', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true })
    // 5 requests per 10 seconds
    const wrapped = applyRateLimit(handler, { maxRequests: 5, windowMs: 10_000 })

    const event = makeMockEvent()

    for (let i = 0; i < 5; i++) {
      await wrapped(event)
    }
    expect(handler).toHaveBeenCalledTimes(5)

    await expect(wrapped(event)).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('uses DEFAULT_RATE_LIMIT_CONFIG when no custom config is provided', async () => {
    // The default is 60 requests per minute
    expect(DEFAULT_RATE_LIMIT_CONFIG.maxRequests).toBe(60)
    expect(DEFAULT_RATE_LIMIT_CONFIG.windowMs).toBe(60_000)

    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler)

    const event = makeMockEvent()

    // Make 60 calls (should all succeed)
    for (let i = 0; i < 60; i++) {
      await wrapped(event)
    }
    expect(handler).toHaveBeenCalledTimes(60)

    // 61st should fail
    await expect(wrapped(event)).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('allows different identifiers to have separate limits', async () => {
    // Two different users should have independent rate limits
    const handler = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = applyRateLimit(handler, { maxRequests: 1, windowMs: 60_000 })

    let callCount = 0
    ;(globalThis as any).getUserSession = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve({ user: { id: callCount } })
    })

    const event1 = makeMockEvent()
    const event2 = makeMockEvent()

    // Both should succeed since they have different identifiers
    await wrapped(event1)
    await wrapped(event2)

    expect(handler).toHaveBeenCalledTimes(2)
  })
})