import { NethackPermissions } from "~~/shared/permissions";
import { users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    await requireUser(event, NethackPermissions.Users.list);

    const results = event.context.drizzle
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            team_id: users.team_id,
            profile_theme: users.profile_theme,
            profile_picture: users.profile_picture,
        })
        .from(users)
        .orderBy(users.id)
        .all();

    return results.map((user) => convertUserToPublic(user as User)) satisfies APIUser[];
});
