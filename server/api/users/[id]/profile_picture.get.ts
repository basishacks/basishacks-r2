import { getUserAsset } from "~~/server/utils/assets"

import { toPng } from 'jdenticon'
import { sendStream } from "h3"
import { Readable } from "stream"

export default defineEventHandler(async (event) => {
  const currentUser = await getUserSession(event)

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  const id = parseInt(getRouterParam(event, 'id')!)

  const user = await getUser(event, id)
  if (!user) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
  if (user.profile_picture) {
    return sendStream(event, Readable.from(await getUserAsset(user.profile_picture)))
  } else {
    // Generate a default profile picture using jdenticon
    const png = toPng(user.email.toString(), 200)
    setResponseHeader(event, 'Content-Type', 'image/png')
    return Readable.from(png)
  }

})

