import type { H3Event } from 'h3'

export async function requireUser(event: H3Event) {
  const {
    user: { id: userID },
  } = await requireUserSession(event)

  const user = await getUser(event, userID)
  if (!user) {
    throw createError({
      status: 401,
      message: 'Logged in user not found',
    })
  }

  return user
}

export async function requireJudge(event: H3Event) {
  const user = await requireUser(event)

  if (user.role !== 'admin' && user.role !== 'judge') {
    throw createError({
      status: 403,
      message: 'Insufficient permissions',
    })
  }

  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)

  if (user.role !== 'admin') {
    throw createError({
      status: 403,
      message: 'Insufficient permissions',
    })
  }

  return user
}
