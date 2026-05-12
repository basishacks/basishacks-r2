import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'

export async function createAsset(name: string, data: Buffer): Promise<string> {
  const assetsDir = join(process.cwd(), 'public', 'assets')
  const filePath = join(assetsDir, name)
  await mkdir(assetsDir, { recursive: true })
  await writeFile(filePath, data)
  return name
}

export async function createUserAsset(name: string, data: Buffer): Promise<string> {
  const assetsDir = join(process.cwd(), 'public', 'userast')
  const filePath = join(assetsDir, name)
  await mkdir(assetsDir, { recursive: true })
  await writeFile(filePath, data)
  return name
}

export async function removeAsset(name: string | null | undefined) {
  if (name) {
    const filePath = join(process.cwd(), 'public', 'assets', name)
    await unlink(filePath).catch(() => {})
  }
}

export async function removeUserAsset(name: string | null | undefined) {
  if (name) {
    const filePath = join(process.cwd(), 'public', 'userast', name)
    await unlink(filePath).catch(() => {})
  }
}

export async function getUserAsset(name: string): Promise<Buffer> {
  const filePath = join(process.cwd(), 'public', 'userast', name)
  return Buffer.from(await readFile(filePath))
}
