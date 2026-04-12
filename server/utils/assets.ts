import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function createAsset(name: string, data: Buffer) {

    const assetsDir = join(process.cwd(), 'public', 'assets')
    const filePath = join(assetsDir, name)
    

    // Ensure the assets directory exists
    await mkdir(assetsDir, { recursive: true })

    // Write the file
    await writeFile(filePath, data)

}