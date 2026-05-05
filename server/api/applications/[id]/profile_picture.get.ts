import { getUserAsset } from "~~/server/utils/assets"

import { toPng } from 'jdenticon'
import { sendStream } from "h3"
import { Readable } from "stream"

export default defineEventHandler(async (event) => {
  const currentUser = await getUserSession(event)

  setResponseHeader(event, 'Content-Type', 'image/png')
  const id = getRouterParam(event, 'id') as string

  const user = await getOAuth2Application(event, id)
  if (!user) {
    throw createError({
      status: 404,
      message: 'Application not found',
    })
  }
  if (user.profile_picture) {
    return sendStream(event, Readable.from(await getUserAsset(user.profile_picture)))
  } else {
    // Generate a default profile picture using jdenticon
    const png = toPng(user.client_id, 200)
    return Readable.from(png)
  }

})

