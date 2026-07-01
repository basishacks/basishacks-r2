import { structureLink } from '~~/server/utils/oauth2'

// ---------------------------------------------------------------------------
// structureLink
// ---------------------------------------------------------------------------

describe('structureLink', () => {
  const expectedBase =
    'https://login.microsoftonline.com/cbc6e1e2-a6bb-4002-bbdc-6da892a051a7/oauth2/v2.0/authorize'

  beforeEach(() => {
    // Ensure a consistent base URL for testing
    process.env.CURRENT_URL_ORIGIN = 'http://localhost:3000'
  })

  function getParam(link: string, name: string): string | null {
    const parsed = new URL(link)
    return parsed.searchParams.get(name)
  }

  it('builds a URL with default scope and redirect_uri', () => {
    const link = structureLink('test-state', 'test-challenge')

    expect(link.startsWith(expectedBase + '?')).toBe(true)
    expect(getParam(link, 'client_id')).toBe('868b989e-6574-4795-bcfb-8db37bee1c37')
    expect(getParam(link, 'response_type')).toBe('code')
    expect(getParam(link, 'redirect_uri')).toBe(
      'http://localhost:3000/api/oauth2/mscallback',
    )
    expect(getParam(link, 'state')).toBe('test-state')
    expect(getParam(link, 'code_challenge')).toBe('test-challenge')
    expect(getParam(link, 'code_challenge_method')).toBe('S256')
  })

  it('includes the default scope "openid profile email" URL-encoded', () => {
    const link = structureLink('s1', 'c1')

    expect(getParam(link, 'scope')).toBe('openid profile email')
  })

  it('accepts a custom scope', () => {
    const link = structureLink('s1', 'c1', 'openid email')

    expect(getParam(link, 'scope')).toBe('openid email')
  })

  it('accepts a custom redirect_uri', () => {
    const link = structureLink('s1', 'c1', 'openid', '/custom/callback')

    expect(getParam(link, 'redirect_uri')).toBe(
      'http://localhost:3000/custom/callback',
    )
  })

  it('prepends CURRENT_URL_ORIGIN to the redirect_uri', () => {
    process.env.CURRENT_URL_ORIGIN = 'https://example.com'
    const link = structureLink('s1', 'c1', 'openid', '/my/callback')

    expect(getParam(link, 'redirect_uri')).toBe('https://example.com/my/callback')
  })

  it('falls back to http://localhost:3000 when CURRENT_URL_ORIGIN is not set', () => {
    delete process.env.CURRENT_URL_ORIGIN
    const link = structureLink('s1', 'c1', 'openid', '/fallback')

    expect(getParam(link, 'redirect_uri')).toBe('http://localhost:3000/fallback')
  })

  it('URL-encodes scope values with special characters', () => {
    const link = structureLink('s1', 'c1', 'openid profile email offline_access')

    expect(getParam(link, 'scope')).toBe('openid profile email offline_access')
  })

  it('preserves state and code_challenge values exactly', () => {
    const link = structureLink('abc123-xyz', 'challenge_value_!@#')

    expect(getParam(link, 'state')).toBe('abc123-xyz')
    expect(getParam(link, 'code_challenge')).toBe('challenge_value_!@#')
  })

  it('produces a URL that starts with the correct Microsoft OAuth2 base', () => {
    const link = structureLink('s1', 'c1')

    expect(link.startsWith(expectedBase)).toBe(true)
  })

  it('includes all required query parameters', () => {
    const link = structureLink('s1', 'c1')
    const parsed = new URL(link)

    const requiredParams = [
      'client_id',
      'response_type',
      'redirect_uri',
      'scope',
      'state',
      'code_challenge',
      'code_challenge_method',
    ]

    for (const param of requiredParams) {
      expect(parsed.searchParams.has(param)).toBe(true)
    }
  })

  it('URL-encodes redirect_uri, state and code_challenge values', () => {
    const link = structureLink(
      'state with spaces/slashes',
      'challenge with spaces/slashes',
      'openid',
      '/callback?extra=1',
    )

    expect(getParam(link, 'redirect_uri')).toBe(
      'http://localhost:3000/callback?extra=1',
    )
    expect(getParam(link, 'state')).toBe('state with spaces/slashes')
    expect(getParam(link, 'code_challenge')).toBe('challenge with spaces/slashes')
  })
})
