import { applyRateLimit } from '~~/server/utils/rateLimit'
import { UpdateUserRequest } from '~~/shared/schemas'

export default defineEventHandler(applyRateLimit(async (event) => {
  const id = parseInt(getRouterParam(event, 'id')!)

  const {
    user: { id: userID },
  } = await requireUserSession(event)

  if (id !== userID) {
    throw createError({
      status: 403,
      message: 'Cannot update other users',
    })
  }

  const { name } = await readValidatedBody(event, UpdateUserRequest.parse)

  const user = await getUser(event, id)
  if (!user) {
    await clearUserSession(event)
    throw createError({
      status: 401,
      message: 'Logged in user not found',
    })
  }

  if (name !== undefined) user.name = name

  await updateUserName(event, user)

  return { message: 'Your profile is updated' }
}, {maxRequests: 10, windowMs: 60 * 1000}))
