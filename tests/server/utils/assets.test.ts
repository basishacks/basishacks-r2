import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import {
  createAsset,
  createUserAsset,
  removeAsset,
  removeUserAsset,
  getUserAsset,
} from '~~/server/utils/assets'

describe('asset helpers', () => {
  let tempDir: string
  let assetsDir: string
  let userAssetsDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'assets-test-'))
    assetsDir = join(tempDir, 'public', 'assets')
    userAssetsDir = join(tempDir, 'public', 'userassets')
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir)
  })

  afterEach(async () => {
    cwdSpy?.mockRestore()
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('createAsset', () => {
    it('writes a safe file to public/assets', async () => {
      const result = await createAsset('hello.txt', Buffer.from('hello'))
      expect(result).toBe('hello.txt')

      const files = await readdir(assetsDir)
      expect(files).toContain('hello.txt')
    })

    it('creates the assets parent directory if missing', async () => {
      const result = await createAsset('hello.txt', Buffer.from('hello'))
      expect(result).toBe('hello.txt')

      const files = await readdir(assetsDir)
      expect(files).toContain('hello.txt')
    })

    it('rejects names containing ..', async () => {
      await expect(createAsset('../escape.txt', Buffer.from('x'))).rejects.toThrow('Invalid asset name')
    })

    it('creates nested directories when name contains /', async () => {
      const result = await createAsset('foo/bar.txt', Buffer.from('x'))
      expect(result).toBe('bar.txt')

      const files = await readdir(join(assetsDir, 'foo'))
      expect(files).toContain('bar.txt')
    })

    it('rejects traversal to .env via ../../.env', async () => {
      await expect(createAsset('../../.env', Buffer.from('x'))).rejects.toThrow('Invalid asset name')
    })

    it('rejects traversal to .env via ..\\..\\.env', async () => {
      await expect(createAsset('..\\..\\.env', Buffer.from('x'))).rejects.toThrow('Invalid asset name')
    })
  })

  describe('createUserAsset', () => {
    it('writes to public/userassets', async () => {
      const result = await createUserAsset('avatar.png', Buffer.from('png'))
      expect(result).toBe('avatar.png')

      const files = await readdir(userAssetsDir)
      expect(files).toContain('avatar.png')
    })

    it('creates the userassets parent directory if missing', async () => {
      const result = await createUserAsset('avatar.png', Buffer.from('png'))
      expect(result).toBe('avatar.png')

      const files = await readdir(userAssetsDir)
      expect(files).toContain('avatar.png')
    })

    it('rejects path traversal names', async () => {
      await expect(createUserAsset('../../../etc/passwd', Buffer.from('x'))).rejects.toThrow('Invalid asset name')
    })
  })

  describe('removeAsset', () => {
    it('removes a safe file', async () => {
      await createAsset('delete-me.txt', Buffer.from('bye'))
      await removeAsset('delete-me.txt')

      const files = await readdir(assetsDir)
      expect(files).not.toContain('delete-me.txt')
    })

    it('rejects path traversal names', async () => {
      await expect(removeAsset('../escape.txt')).rejects.toThrow('Invalid asset name')
    })
  })

  describe('removeUserAsset', () => {
    it('removes a safe user asset', async () => {
      await createUserAsset('delete-me.png', Buffer.from('bye'))
      await removeUserAsset('delete-me.png')

      const files = await readdir(userAssetsDir)
      expect(files).not.toContain('delete-me.png')
    })

    it('rejects path traversal names', async () => {
      await expect(removeUserAsset('../escape.txt')).rejects.toThrow('Invalid asset name')
    })
  })

  describe('getUserAsset', () => {
    it('reads a safe user asset', async () => {
      await createUserAsset('readable.txt', Buffer.from('content'))
      const data = await getUserAsset('readable.txt')
      expect(data.toString()).toBe('content')
    })

    it('rejects path traversal names', async () => {
      await expect(getUserAsset('../assets/secret.txt')).rejects.toThrow('Invalid asset name')
    })
  })
})