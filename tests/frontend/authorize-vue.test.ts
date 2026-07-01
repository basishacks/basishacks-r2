import { describe, it, expect } from 'vitest'
import { buildOAuth2SessionBody } from '~~/app/utils/oauth2'

describe('authorize.vue session body helper', () => {
  it('forwards the OAuth2 state parameter correctly', () => {
    const body = buildOAuth2SessionBody({
      client_id: 'client-id',
      response_type: 'code',
      scope: 'openid profile',
      state: 'cross-site-request-forgery-token',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      redirect_uri: 'https://example.com/callback',
    })

    expect(body.state).toBe('cross-site-request-forgery-token')
    expect(body).toEqual({
      client_id: 'client-id',
      response_type: 'code',
      scope: 'openid profile',
      state: 'cross-site-request-forgery-token',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      redirect_uri: 'https://example.com/callback',
    })
  })
})
