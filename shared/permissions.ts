export const DevPermissions = {
  USERS: 'dev_users',
  TEAMS: 'dev_teams',
  APPLICATIONS: 'dev_applications',
  DEBUG: 'dev_debug',
  DEEPSEEK: 'dev_deepseek',
} as const

export function parsePermissions(role: string | null | undefined): string[] {
  if (!role) return []
  return role
    .split(' ')
    .map((p) => decodeURIComponent(p.trim()))
    .filter(Boolean)
}

export function hasPermission(role: string | null | undefined, permission: string): boolean {
  return parsePermissions(role).includes(permission)
}

export function addPermission(role: string | null | undefined, permission: string): string {
  const perms = parsePermissions(role)
  if (perms.includes(permission)) {
    return serializePermissions(perms)
  }
  return serializePermissions([...perms, permission])
}

export function removePermission(role: string | null | undefined, permission: string): string {
  return serializePermissions(parsePermissions(role).filter((p) => p !== permission))
}

function serializePermissions(perms: string[]): string {
  return perms.map((p) => encodeURIComponent(p)).join(' ')
}
