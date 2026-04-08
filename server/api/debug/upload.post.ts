import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData || !formData[0]) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = formData[0]
  if (!file.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file' })
  }

  const uuid = randomUUID()
  const assetsDir = join(process.cwd(), 'public', 'assets')
  const filePath = join(assetsDir, uuid)

  // Ensure the assets directory exists
  await mkdir(assetsDir, { recursive: true })

  // Write the file
  await writeFile(filePath, file.data)

  // Permalink is the public URL
  const permalink = `/assets/${uuid}`

  return { permalink }
})