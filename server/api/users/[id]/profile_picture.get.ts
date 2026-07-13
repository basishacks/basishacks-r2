import { getUserAsset } from "~~/server/utils/assets";
import { toPng } from "jdenticon";
import { sendStream } from "h3";
import { Readable } from "stream";
import { UserIdParams } from "~~/shared/schemas";

export default defineEventHandler(async (event) => {
    const currentUser = await getUserSession(event);

    setResponseHeader(event, "Content-Type", "image/png");
    const { id } = await getValidatedRouterParams(event, UserIdParams.parse);

    const user = await getUser(event, id);
    if (!user) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }
    if (user.profile_picture) {
        return sendStream(event, Readable.from(await getUserAsset(user.profile_picture)));
    }
    const png = toPng(user.email.toString(), 200);
    return Readable.from(png);
});
