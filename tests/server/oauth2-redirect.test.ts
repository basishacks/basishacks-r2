import { vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('sendRedirect', () => {})
vi.stubGlobal('deleteCookie', () => {})
vi.stubGlobal('setCookie', () => {})
vi.stubGlobal('createError', (err: any) => new Error(err.message))

process.env.ONSITE_LOGIN_CLIENT_ID = 'test-onsite-client-id'

const { constructOnSiteLoginURL } = await import('~~/server/api/login.get')
const { completeConsentFlow } = await import('~~/server/utils/oauth2-validate')

describe('OAuth2 post-login redirect preservation', () => {
  it('constructOnSiteLoginURL forwards the post-login redirect', () => {
    const event = {
      context: {},
      node: { req: {}, res: {} },
    } as any
    const url = constructOnSiteLoginURL(event, '/dashboard/teams')
    expect(url).toContain('post_login_redirect=')
    expect(url).toContain(encodeURIComponent('/dashboard/teams'))
  })

  it('completeConsentFlow appends the post-login redirect when present', () => {
    const event = {
      context: {},
      node: { req: {}, res: {} },
    } as any
    const session: any = {
      redirect_uri: 'https://example.com/callback',
      bh_state: 'state-123',
      post_login_redirect: '/voting',
      code: null,
      login_state: 'completed',
    }

    const url = completeConsentFlow(event, session)
    expect(url).toContain('code=')
    expect(url).toContain('state=state-123')
    expect(url).toContain('redirect=%2Fvoting')
  })

  it('completeConsentFlow omits redirect when no post-login redirect is stored', () => {
    const event = {
      context: {},
      node: { req: {}, res: {} },
    } as any
    const session: any = {
      redirect_uri: 'https://example.com/callback',
      bh_state: 'state-123',
      post_login_redirect: null,
      code: null,
      login_state: 'completed',
    }

    const url = completeConsentFlow(event, session)
    expect(url).not.toContain('redirect=')
  })
})
