// Single source of truth for OAuth2 scopes.
// To add a new scope, just add an entry below — it propagates to validation,
// API responses, and the UI picker modal automatically.
// Set adminOnly: true for scopes that require admin privileges to assign.

export interface OAuth2ScopeMeta {
  description: string
  adminOnly: boolean
  sensitive: boolean
  tooltip?: string
}

export const OAuth2Scopes: Record<string, OAuth2ScopeMeta> = {
    openid: {
        description: 'Access basic OpenID Connect identity information',
        adminOnly: false,
        sensitive: false
    },
    profile: {
        description: 'Access user profile information (name, picture, etc.)',
        adminOnly: false,
        sensitive: false
    },
    email: {
        description: "Access user's email address",
        adminOnly: false,
        sensitive: false
    },
    "meetings.read.application": {
        description: 'Reads meetings that are bound to this application.',
        adminOnly: false,
        sensitive: false,
        tooltip: "This application can only access meetings created by the application itself. Other meetings are inaccessible by this application"
    },
    "meetings.read.all": {
        description: 'Reads all meetings of the user',
        adminOnly: true,
        sensitive: true
    },
    "meetings.readwrite.application": {
        description: 'Reads and writes meeting applications bound to this application.',
        adminOnly: false,
        sensitive: false
    },
    "meetings.readwrite.all": {
        description: 'Reads and writes all meetings',
        adminOnly: true,
        sensitive: true
    },
    "chat.read": {
        description: 'Read Microsoft Teams chat',
        adminOnly: false,
        sensitive: true,
        tooltip: "This application can read chats between you and other specified users. It cannot read or recieve group chats or general chat messages from everyone."
    },
    // Example admin-only scope:
    // admin: { description: 'Access administrative functions', adminOnly: true },
}

export const OAuth2ScopeDescriptions = Object.fromEntries(
  Object.entries(OAuth2Scopes).map(([k, v]) => [k, v.description])
)

export const OAuth2ScopesList = Object.keys(OAuth2Scopes)

export function isAdminScope(scope: string): boolean {
  return OAuth2Scopes[scope]?.adminOnly ?? false
}

export function parseScopes(scopes: string | null | undefined): string[] {
  if (!scopes) return []
  return scopes.split(' ').filter(Boolean)
}

export function hasScope(
  scopes: string | null | undefined,
  scope: string
): boolean {
  return parseScopes(scopes).includes(scope)
}

export function addScopes(
  scopes: string | null | undefined,
  toAdd: string[]
): string {
  const existing = parseScopes(scopes)
  const combined = [...existing]
  for (const s of toAdd) {
    if (!combined.includes(s)) combined.push(s)
  }
  return combined.join(' ')
}

export function removeScope(
  scopes: string | null | undefined,
  toRemove: string
): string {
  return parseScopes(scopes)
    .filter((s) => s !== toRemove)
    .join(' ')
}
