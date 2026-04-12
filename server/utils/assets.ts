import { rmdir } from 'node:fs'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import fs from "node:fs"

export async function createAsset(name: string, data: Buffer): Promise<string> {

    const assetsDir = join(process.cwd(), 'public', 'assets')
    const filePath = join(assetsDir, name)
    

    // Ensure the assets directory exists
    await mkdir(assetsDir, { recursive: true })

    // Write the file
    await writeFile(filePath, data)

    return name

}

export async function removeAsset(name: string | null | undefined) {

    const assetsDir = join(process.cwd(), 'public', 'assets')
    if (name) {
        const filePath = join(assetsDir, name)
        await fs.unlink(filePath, (e) => {

        });
    }
    
    
    

}