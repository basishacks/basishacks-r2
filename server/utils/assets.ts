import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join, dirname, sep } from "node:path";
import { basename } from "node:path/posix";
import { createError } from "h3";

function sanitizeAssetName(name: string) {
    if (!name || typeof name !== "string") {
        throw createError({ statusCode: 400, statusMessage: "Invalid asset name" });
    }
    const safeName = basename(name);
    if (!safeName || safeName === "." || safeName === "..") {
        throw createError({ statusCode: 400, statusMessage: "Invalid asset name" });
    }
    if (safeName.includes("/") || safeName.includes("\\")) {
        throw createError({ statusCode: 400, statusMessage: "Invalid asset name" });
    }
}

function resolveAssetPath(assetsDir: string, name: string) {
    const filePath = join(assetsDir, name);
    const prefix = assetsDir + sep;
    if (!filePath.startsWith(prefix)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid asset name" });
    }
    return filePath;
}

export async function createAsset(name: string, data: Buffer): Promise<string> {
    const assetsDir = join(process.cwd(), "public", "assets");
    sanitizeAssetName(name);
    const filePath = resolveAssetPath(assetsDir, name);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return basename(name);
}

export async function createUserAsset(name: string, data: Buffer): Promise<string> {
    const assetsDir = join(process.cwd(), "public", "userassets");
    sanitizeAssetName(name);
    const filePath = resolveAssetPath(assetsDir, name);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return basename(name);
}

export async function removeAsset(name: string | null | undefined) {
    if (!name) return;
    sanitizeAssetName(name);
    const assetsDir = join(process.cwd(), "public", "assets");
    const filePath = resolveAssetPath(assetsDir, name);
    try {
        await rm(filePath);
    } catch {
        // Ignore missing or invalid files
    }
}

export async function removeUserAsset(name: string | null | undefined) {
    if (!name) return;
    sanitizeAssetName(name);
    const assetsDir = join(process.cwd(), "public", "userassets");
    const filePath = resolveAssetPath(assetsDir, name);
    try {
        await rm(filePath);
    } catch {
        // Ignore missing or invalid files
    }
}

export async function getUserAsset(name: string): Promise<Buffer> {
    const assetsDir = join(process.cwd(), "public", "userassets");
    sanitizeAssetName(name);
    const filePath = resolveAssetPath(assetsDir, name);
    return Buffer.from(await readFile(filePath));
}
