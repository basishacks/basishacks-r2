import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { requireAdmin } from '~~/server/utils/auth'

const readDirectoryFiles = async (dir: string) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  } catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const assetsDir = join(process.cwd(), 'public', 'assets')
  const userAstDir = join(process.cwd(), 'public', 'userast')

  return {
    assets: await readDirectoryFiles(assetsDir),
    userast: await readDirectoryFiles(userAstDir),
  }
})
