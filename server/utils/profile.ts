import jdenticon from "jdenticon";

export async function generateIdenticonPNG(name: string, size: number = 100): Promise<Buffer> {
    const png = jdenticon.toPng(name, size);
    // Sanitize name for filesystem safety (emails contain @ and other special chars)
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    await createAsset(`users/${safeName}.png`, png);
    return png;
}
