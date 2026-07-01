import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret'
  process.env.MICROSOFT_DUMMY_USER_NAME = 'dummy@basischina.com'
  process.env.MICROSOFT_DUMMY_USER_PASSWORD = 'test-password'
})

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn())

  // Re-import to reset module-level metadata/promises
  const mod = await import('~~/server/plugins/microsoft')
  return mod
})

describe('Microsoft Graph request helpers', () => {
  it('refreshes application token on 401 and retries once', async () => {
    const mod = await import('~~/server/plugins/microsoft')
    const { requestMicrosoft } = mod

    let graphCall = 0
    vi.mocked(fetch).mockImplementation((url: any) => {
      const u = url.toString()
      if (u.includes('login.microsoftonline.com')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ access_token: 'new-app-token' }),
        } as Response)
      }
      graphCall++
      if (graphCall === 1) {
        return Promise.resolve({ status: 401 } as Response)
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ value: [] }),
      } as Response)
    })

    const res = await requestMicrosoft('/me')

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(4)
    const graphCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      (url as string).includes('graph.microsoft.com'),
    )
    expect(graphCalls).toHaveLength(2)
  })

  it('refreshes dummy user token on 401 and retries once', async () => {
    const mod = await import('~~/server/plugins/microsoft')
    const { requestUserMicrosoft, initializeDummyUserAccessToken } = mod

    let graphCall = 0
    vi.mocked(fetch).mockImplementation((url: any) => {
      const u = url.toString()
      if (u.includes('login.microsoftonline.com')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ access_token: 'new-user-token' }),
        } as Response)
      }
      graphCall++
      if (graphCall === 1) {
        return Promise.resolve({ status: 401 } as Response)
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ value: [] }),
      } as Response)
    })

    await initializeDummyUserAccessToken()

    const res = await requestUserMicrosoft('/me/chats')

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(4)
    const graphCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      (url as string).includes('graph.microsoft.com'),
    )
    expect(graphCalls).toHaveLength(2)
  })

  it('does not retry user requests indefinitely when graph keeps returning 401', async () => {
    const mod = await import('~~/server/plugins/microsoft')
    const { requestUserMicrosoft, initializeDummyUserAccessToken } = mod

    vi.mocked(fetch).mockImplementation((url: any) => {
      const u = url.toString()
      if (u.includes('login.microsoftonline.com')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ access_token: 'new-user-token' }),
        } as Response)
      }
      return Promise.resolve({ status: 401 } as Response)
    })

    await initializeDummyUserAccessToken()

    await expect(requestUserMicrosoft('/me/chats')).rejects.toThrow(
      'User token refresh failed after retry',
    )

    const graphCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
      (url as string).includes('graph.microsoft.com'),
    )
    expect(graphCalls).toHaveLength(2)
  })
})
