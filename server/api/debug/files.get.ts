import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { requireUser } from "~~/server/utils/auth";
import { NethackPermissions } from "~~/shared/permissions";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const readDirectoryFiles = async (dir: string) => {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch {
        return [];
    }
};

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireUser(event, NethackPermissions.Debug.filesRead);

        const assetsDir = join(process.cwd(), "public", "assets");
        const userAstDir = join(process.cwd(), "public", "userast");

        return {
            assets: await readDirectoryFiles(assetsDir),
            userast: await readDirectoryFiles(userAstDir),
        };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);
