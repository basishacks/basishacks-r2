/**
 * OAuth2 Microsoft link generation utility
 *
 * Extracted from route handler to avoid circular dependencies.
 */
import { createHash, randomBytes } from 'crypto'
import { structureLink } from '~~/shared/oauth2'
import type { AuthorizeSession } from './oauth2-session'

export function generateMicrosoftOAuth2Link(session: AuthorizeSession) {
  const state = randomBytes(75).toString('base64url')

  const pkce_code_verifier: string | null = randomBytes(74).toString('base64url')
  const pkce_code_challenge = createHash('sha256').update(pkce_code_verifier).digest('base64url')
  console.log(
    '[Authorize -> ToMS] Requested MS OAuth2 Link: T:' +
      session.token.substring(0, 16) +
      '... Verif:' +
      pkce_code_verifier.substring(0, 16) +
      '... SHA256:' +
      pkce_code_challenge.substring(0, 16) +
      '...',
  )

  session.ms_state = state
  session.ms_verifier = pkce_code_verifier

  return structureLink(state, pkce_code_challenge, undefined, undefined, process.env.CURRENT_URL_ORIGIN || 'http://localhost:3000')
}
