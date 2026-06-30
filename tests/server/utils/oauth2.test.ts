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

  it('builds a URL with default scope and redirect_uri', () => {
    const link = structureLink('test-state', 'test-challenge')

    expect(link).toContain(expectedBase)
    expect(link).toContain('client_id=868b989e-6574-4795-bcfb-8db37bee1c37')
    expect(link).toContain('response_type=code')
    expect(link).toContain('redirect_uri=http://localhost:3000/api/oauth2/mscallback')
    expect(link).toContain('state=test-state')
    expect(link).toContain('code_challenge=test-challenge')
    expect(link).toContain('code_challenge_method=S256')
  })

  it('includes the default scope "openid profile email" URL-encoded', () => {
    const link = structureLink('s1', 'c1')

    // The space in "openid profile email" should be URL-encoded
    expect(link).toContain('scope=openid%20profile%20email')
    // Or it could be encoded as +
    const scopeMatch = link.match(/scope=([^&]+)/)
    expect(scopeMatch).toBeTruthy()
    expect(decodeURIComponent(scopeMatch![1])).toBe('openid profile email')
  })

  it('accepts a custom scope', () => {
    const link = structureLink('s1', 'c1', 'openid email')

    const scopeMatch = link.match(/scope=([^&]+)/)
    expect(scopeMatch).toBeTruthy()
    expect(decodeURIComponent(scopeMatch![1])).toBe('openid email')
  })

  it('accepts a custom redirect_uri', () => {
    const link = structureLink('s1', 'c1', 'openid', '/custom/callback')

    expect(link).toContain('redirect_uri=http://localhost:3000/custom/callback')
  })

  it('prepends CURRENT_URL_ORIGIN to the redirect_uri', () => {
    process.env.CURRENT_URL_ORIGIN = 'https://example.com'
    const link = structureLink('s1', 'c1', 'openid', '/my/callback')

    expect(link).toContain('redirect_uri=https://example.com/my/callback')
  })

  it('falls back to http://localhost:3000 when CURRENT_URL_ORIGIN is not set', () => {
    delete process.env.CURRENT_URL_ORIGIN
    const link = structureLink('s1', 'c1', 'openid', '/fallback')

    expect(link).toContain('redirect_uri=http://localhost:3000/fallback')
  })

  it('URL-encodes scope values with special characters', () => {
    const link = structureLink('s1', 'c1', 'openid profile email offline_access')

    const scopeMatch = link.match(/scope=([^&]+)/)
    expect(scopeMatch).toBeTruthy()
    // Spaces should be encoded
    expect(decodeURIComponent(scopeMatch![1])).toBe('openid profile email offline_access')
  })

  it('preserves state and code_challenge values exactly', () => {
    const link = structureLink('abc123-xyz', 'challenge_value_!@#')

    expect(link).toContain('state=abc123-xyz')
    expect(link).toContain('code_challenge=challenge_value_!@#')
  })

  it('produces a URL that starts with the correct Microsoft OAuth2 base', () => {
    const link = structureLink('s1', 'c1')

    expect(link.startsWith(expectedBase)).toBe(true)
  })

  it('includes all required query parameters', () => {
    const link = structureLink('s1', 'c1')

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
      expect(link).toContain(`${param}=`)
    }
  })
})