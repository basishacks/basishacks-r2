import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createAsset } from '~~/server/utils/assets'

export default defineEventHandler(async (event) => {

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

  await createAsset(`${uuid}.${extension}`, file.data);
  

  // Permalink is the public URL
  const permalink = `/assets/${uuid}.${extension}`

  return { permalink }
})