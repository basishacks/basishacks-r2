import { randomUUID } from "crypto";
import { createAsset, createUserAsset } from "~~/server/utils/assets";
import { DevPermissions } from "~~/shared/permissions";
import { requireUser } from "~~/server/utils/auth";

const ALLOWED_EXTENSIONS = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "pdf",
    "txt",
    "md",
    "json",
    "zip",
    "mp4",
]);

export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    await requireUser(event);
    await requirePermission(event, DevPermissions.DEBUG);

    const formData = await readMultipartFormData(event);
    if (!formData || !formData[0]) {
        throw createError({ statusCode: 400, message: "No file uploaded" });
    }

    const file = formData[0];
    if (!file.data || !file.filename) {
        throw createError({ statusCode: 400, message: "Invalid file" });
    }

    const uuid = randomUUID();
    const extension = file.filename.split(".").pop()?.toLowerCase() || "";
    if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
        throw createError({ statusCode: 400, message: "File extension not allowed" });
    }

    const keepName = query.keepName === "true";
    const fileName = keepName ? file.filename : `${uuid}.${extension}`;

    if (query.mode == undefined) {
        throw createError({ statusCode: 400, message: "Invalid mode" });
    }

    if (query.mode == "static") {
        await createAsset(fileName, file.data);
    } else if (query.mode == "user") {
        await createUserAsset(fileName, file.data);
    } else {
        throw createError({ statusCode: 400, message: "Invalid mode" });
    }

    // Permalink is the public URL
    const permalink = `/${query.mode == "static" ? "assets" : "userast"}/${fileName}`;

    return { permalink };
});
