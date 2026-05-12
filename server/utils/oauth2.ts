// In-memory OAuth2 store
// In production, these would be in a database

export const oauth2Store = {
  // OAuth2 Clients
  clients: [
    {
      id: '6da16c8f-aca0-4032-b28f-973f1ba7a89b',
      secret: 'test-secret',
      name: 'Test Client',
      redirectUris: ['http://localhost:3000/callback'],
      allowedScopes: ['openid', 'profile', 'email']
    }
  ],

  // OAuth2 Users
  users: [
    {
      id: 1,
      email: 'user@example.com',
      name: 'Test User'
    },
    {
      id: 2,
      email: 'admin@example.com',
      name: 'Admin User'
    }
  ],

  // Active authorization codes (temp, auto-expires)
  authorizationCodes: new Map<string, {
    code: string
    clientId: string
    userId: number
    redirectUri: string
    scope: string
    expiresAt: number
    used: boolean
  }>(),

  // Active access tokens
  accessTokens: new Map<string, {
    token: string
    clientId: string
    userId: number
    scope: string
    expiresAt: number
  }>(),

  // Active refresh tokens
  refreshTokens: new Map<string, {
    token: string
    clientId: string
    userId: number
    scope: string
    expiresAt: number
  }>()
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return Math.random().toString(36).substring(2, length + 2) +
         Math.random().toString(36).substring(2, length + 2)
}

/**
 * Get client by ID
 */
export function verifyClient(clientId: string, clientSecret: string) {
  return oauth2Store.clients.find(c => c.id === clientId && c.secret === clientSecret) || null
}

export function getOAuth2Client(clientId: string) {
  return oauth2Store.clients.find(c => c.id === clientId) || null
}

/**
 * Get user by ID
 */
export function getOAuth2User(userId: number) {
  return oauth2Store.users.find(u => u.id === userId)
}

/**
 * Create authorization code
 */
export function createAuthCode(clientId: string, userId: number, redirectUri: string, scope: string) {
  const code = generateToken(16)
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

  oauth2Store.authorizationCodes.set(code, {
    code,
    clientId,
    userId,
    redirectUri,
    scope,
    expiresAt,
    used: false
  })

  return code
}

/**
 * Get authorization code
 */
export function getAuthCode(code: string) {
  const authCode = oauth2Store.authorizationCodes.get(code)
  
  if (!authCode) return null
  if (authCode.expiresAt < Date.now()) {
    oauth2Store.authorizationCodes.delete(code)
    return null
  }

  return authCode
}

/**
 * Use authorization code (mark as used)
 */
export function useAuthCode(code: string) {
  const authCode = getAuthCode(code)
  if (!authCode || authCode.used) return null

  authCode.used = true
  return authCode
}

/**
 * Create access token
 */
export function createAccessToken(clientId: string, userId: number, scope: string) {
  const token = generateToken()
  const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

  oauth2Store.accessTokens.set(token, {
    token,
    clientId,
    userId,
    scope,
    expiresAt
  })

  return token
}

/**
 * Get access token details
 */
export function getAccessToken(token: string) {
  const accessToken = oauth2Store.accessTokens.get(token)
  
  if (!accessToken) return null
  if (accessToken.expiresAt < Date.now()) {
    oauth2Store.accessTokens.delete(token)
    return null
  }

  return accessToken
}

/**
 * Create refresh token
 */
export function createRefreshToken(clientId: string, userId: number, scope: string) {
  const token = generateToken()
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  oauth2Store.refreshTokens.set(token, {
    token,
    clientId,
    userId,
    scope,
    expiresAt
  })

  return token
}

/**
 * Get refresh token details
 */
export function getRefreshToken(token: string) {
  const refreshToken = oauth2Store.refreshTokens.get(token)
  
  if (!refreshToken) return null
  if (refreshToken.expiresAt < Date.now()) {
    oauth2Store.refreshTokens.delete(token)
    return null
  }

  return refreshToken
}
