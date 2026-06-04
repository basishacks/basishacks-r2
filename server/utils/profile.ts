import jdenticon from "jdenticon";

export async function generateIdenticonPNG(name: string, size: number = 100): Promise<Buffer> {
    const png = jdenticon.toPng(name, size);
    await createAsset(`users/${name}.png`, png);
    return png;
}
