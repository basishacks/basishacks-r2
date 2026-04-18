import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { useRoute } from 'nuxt/app'
import { createAsset, createUserAsset } from '~~/server/utils/assets'

export default defineEventHandler(async (event) => {

  const query = getQuery(event);


  await requireAdmin(event)

  const formData = await readMultipartFormData(event)
  if (!formData || !formData[0]) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = formData[0]
  if (!file.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file' })
  }

  const uuid = randomUUID()
  const extension = file.filename.split('.').pop()?.toLowerCase() || ''

  if (query.mode == undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid mode' })
  }

  if (query.mode == "static") {
    await createAsset(`${uuid}.${extension}`, file.data);
  } else if (query.mode == "user") {
    await createUserAsset(`${uuid}.${extension}`, file.data);
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Invalid mode' })
  }
  

  // Permalink is the public URL
  const permalink = `/${query.mode}}/${uuid}.${extension}`

  return { permalink }
})