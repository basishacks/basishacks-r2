import { create } from "domain"

const jd = require("jdenticon")

export async function generateIdenticonPNG(name: string, size: number = 100): Promise<Buffer> {

    const png = jd.toPng(name, size)

    await createAsset(`users/${name}.png`, png)

    return png

}