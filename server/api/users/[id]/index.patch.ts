import { randomUUID } from "node:crypto";
import { createUserAsset, removeUserAsset } from "~~/server/utils/assets";
import { updateUserProfilePicture } from "~~/server/utils/database/users";
import { applyRateLimit } from "~~/server/utils/rateLimit";
import { UpdateUserRequest } from "~~/shared/schemas";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const base64ToFile = function (base64String: string): any {
    // 1. Split the header from the data
    const arr: any = base64String.split(",");
    if (arr.length < 2) {
        throw createError({
            status: 400,
            message: "Invalid image data format. Expected a base64 data URL.",
        });
    }

    const mime = arr[0]?.split(";")[0]?.split(":")[1];

    if (!mime) {
        throw createError({
            status: 400,
            message: "Could not determine image type from upload data.",
        });
    }

    const mimeToExt: any = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "application/pdf": "pdf",
        "text/plain": "txt",
    };

    const extension = mimeToExt[mime] || "bin";

    // 2. Decode the Base64 string to a binary string
    let bstr: string;
    try {
        bstr = atob(arr[1]);
    } catch {
        throw createError({
            status: 400,
            message: "Invalid base64 image data.",
        });
    }
    let n = bstr.length;

    // 3. Convert binary string to a typed array (Uint8Array)
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    const file = new File([u8arr], "", { type: mime });

    // 4. Create and return the File object
    return {
        file,
        extension,
        mime,
    };
};

export default defineEventHandler(
    applyRateLimit(
        async (event) => {
            const id = parseInt(getRouterParam(event, "id")!);

            const {
                user: { id: userID },
            } = await requireUserSession(event);

            if (id !== userID) {
                throw createError({
                    status: 403,
                    message: "Cannot update other users",
                });
            }

            const { name, profile_theme_image, avatar } = await readValidatedBody(
                event,
                UpdateUserRequest.parse,
            );

            const user = await getUser(event, id);
            if (!user) {
                await clearUserSession(event);
                throw createError({
                    status: 401,
                    message: "Logged in user not found",
                });
            }

            if (name !== undefined) {
                user.name = name;
                await updateUserName(event, user);
            }
            if (profile_theme_image !== undefined) {
                if (profile_theme_image === null) {
                    await removeUserAsset(user.profile_theme?.split("|")[1]);
                    user.profile_theme = null;
                    await updateUserProfileTheme(event, user);
                } else {
                    const { file, extension, mime } = base64ToFile(profile_theme_image.toString());

                    if (!ACCEPTED_IMAGE_TYPES.includes(mime)) {
                        throw createError({
                            status: 400,
                            message:
                                "Invalid image type for profile theme. Only JPEG, PNG, GIF, and WebP are allowed.",
                        });
                    }

                    const buf = await file.arrayBuffer();
                    if (buf.byteLength > MAX_FILE_SIZE) {
                        throw createError({
                            status: 413,
                            message: "Profile theme image is too large. Maximum size is 10MB.",
                        });
                    }

                    await removeUserAsset(user.profile_theme?.split("|")[1]);
                    const uuid = randomUUID();
                    const path = await createUserAsset(uuid + "." + extension, Buffer.from(buf));

                    user.profile_theme = "url|" + path;

                    await updateUserProfileTheme(event, user);
                }
            }

            if (avatar !== undefined) {
                if (avatar === null) {
                    await removeUserAsset(user.profile_picture);
                    user.profile_picture = null;
                    await updateUserProfilePicture(event, user);
                } else {
                    const { file, extension, mime } = base64ToFile(avatar.toString());

                    if (!ACCEPTED_IMAGE_TYPES.includes(mime)) {
                        throw createError({
                            status: 400,
                            message:
                                "Invalid image type for avatar. Only JPEG, PNG, GIF, and WebP are allowed.",
                        });
                    }

                    const buf = await file.arrayBuffer();
                    if (buf.byteLength > MAX_FILE_SIZE) {
                        throw createError({
                            status: 413,
                            message: "Avatar image is too large. Maximum size is 10MB.",
                        });
                    }

                    await removeUserAsset(user.profile_picture);
                    const uuid = randomUUID();
                    const path = await createUserAsset(uuid + "." + extension, Buffer.from(buf));

                    user.profile_picture = path;

                    await updateUserProfilePicture(event, user);
                }
            }

            return { message: "Your profile is updated" };
        },
        { maxRequests: 10, windowMs: 60 * 1000 },
    ),
);
