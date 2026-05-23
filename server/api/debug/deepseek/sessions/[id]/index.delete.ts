import { getDeepSeekSession, deleteSession } from '~~/server/utils/deepseek-store'
import { requirePermission } from '~~/server/utils/auth'
import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.DEEPSEEK)

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId || isNaN(Number(sessionId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid session ID',
    })
  }

  try {
    // Verify session exists
    const session = getDeepSeekSession(Number(sessionId))

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Session not found',
      })
    }

    // Delete the session
    deleteSession(Number(sessionId))

    return {
      success: true,
      message: 'Session deleted successfully',
      deletedSessionId: Number(sessionId),
    }
  } catch (error: any) {
    console.error('Error deleting deepseek session:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete session: ' + error.message,
    })
  }
})
