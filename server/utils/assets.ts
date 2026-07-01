import { mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { join, dirname, basename, sep } from 'node:path'
import { createError } from 'h3'

async function validateAssetPath(assetsDir: string, name: string) {
  const safeName = basename(name)
  if (safeName !== name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw createError({ statusCode: 400, message: 'Invalid asset name' })
  }
  const filePath = join(assetsDir, safeName)
  if (!filePath.startsWith(assetsDir.endsWith(sep) ? assetsDir : assetsDir + sep)) {
    throw createError({ statusCode: 400, message: 'Invalid asset path' })
  }
  return filePath
}

export async function createAsset(name: string, data: Buffer): Promise<string> {
  const assetsDir = join(process.cwd(), 'public', 'assets')
  const filePath = await validateAssetPath(assetsDir, name)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
  return basename(name)
}

export async function createUserAsset(name: string, data: Buffer): Promise<string> {
  const assetsDir = join(process.cwd(), 'public', 'userassets')
  const filePath = await validateAssetPath(assetsDir, name)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
  return basename(name)
}

export async function removeAsset(name: string | null | undefined) {
  if (name) {
    try {
      const assetsDir = join(process.cwd(), 'public', 'assets')
      const filePath = await validateAssetPath(assetsDir, name)
      await rm(filePath)
    } catch {
      // Ignore missing or invalid files
    }
  }
}

export async function removeUserAsset(name: string | null | undefined) {
  if (name) {
    try {
      const assetsDir = join(process.cwd(), 'public', 'userassets')
      const filePath = await validateAssetPath(assetsDir, name)
      await rm(filePath)
    } catch {
      // Ignore missing or invalid files
    }
  }
}

export async function getUserAsset(name: string): Promise<Buffer> {
  const assetsDir = join(process.cwd(), 'public', 'userassets')
  const filePath = await validateAssetPath(assetsDir, name)
  return Buffer.from(await readFile(filePath))
}
