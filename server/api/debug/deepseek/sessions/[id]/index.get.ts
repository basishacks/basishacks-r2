import { getDeepSeekSession } from '~~/server/utils/deepseek-store'
import { requirePermission } from '~~/server/utils/auth'
import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_DEEPSEEK_VIEW)

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId || isNaN(Number(sessionId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid session ID',
    })
  }

  try {
    const session = getDeepSeekSession(Number(sessionId))

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Session not found',
      })
    }

    return session
  } catch (error: any) {
    console.error('Error retrieving deepseek session:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve session: ' + error.message,
    })
  }
})
