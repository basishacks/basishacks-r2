import type { H3Event } from "h3";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
    users,
    teamScores,
    ballots,
    ballotScores,
    userPastTeams,
    peerVotingScores,
    oauth2Applications,
} from "~~/server/database/schema";

export async function getUser(event: H3Event, userID: number): Promise<User | null> {
    const row = event.context.drizzle.select().from(users).where(eq(users.id, userID)).get();

    return row ?? null;
}

export async function getUserByEmail(event: H3Event, email: string): Promise<User | null> {
    const row = event.context.drizzle
        .select()
        .from(users)
        .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
        .get();

    return row ?? null;
}

export async function createUserForEmail(event: H3Event, email: string): Promise<User> {
    const existingUser = await getUserByEmail(event, email);
    if (existingUser) return existingUser;

    return event.context.drizzle
        .insert(users)
        .values({ email: email.toLowerCase() })
        .returning()
        .get()!;
}

export async function updateUserName(event: H3Event, user: User) {
    const result = event.context.drizzle
        .update(users)
        .set({ name: user.name })
        .where(eq(users.id, user.id))
        .run();

    if (result.changes === 0) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }
}

export async function updateUserProfileTheme(event: H3Event, user: User) {
    const result = event.context.drizzle
        .update(users)
        .set({ profile_theme: user.profile_theme })
        .where(eq(users.id, user.id))
        .run();

    if (result.changes === 0) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }
}

export async function updateUserProfilePicture(event: H3Event, user: User) {
    const result = event.context.drizzle
        .update(users)
        .set({ profile_picture: user.profile_picture })
        .where(eq(users.id, user.id))
        .run();

    if (result.changes === 0) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }
}

export async function updateUserRole(event: H3Event, userID: number, role: string) {
    const result = event.context.drizzle
        .update(users)
        .set({ role })
        .where(eq(users.id, userID))
        .run();

    if (result.changes === 0) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }
}

export async function deleteUsers(event: H3Event, userIDs: number[]) {
    for (const id of userIDs) {
        event.context.drizzle.transaction((tx) => {
            tx.delete(teamScores).where(eq(teamScores.judge_user_id, id)).run();

            tx.delete(ballotScores)
                .where(
                    inArray(
                        ballotScores.ballot_id,
                        tx.select({ id: ballots.id }).from(ballots).where(eq(ballots.user_id, id)),
                    ),
                )
                .run();

            tx.delete(ballots).where(eq(ballots.user_id, id)).run();

            tx.delete(peerVotingScores).where(eq(peerVotingScores.user_id, id)).run();

            tx.delete(userPastTeams).where(eq(userPastTeams.user_id, id)).run();

            tx.delete(oauth2Applications).where(eq(oauth2Applications.owner_id, id)).run();

            tx.delete(users).where(eq(users.id, id)).run();
        });
    }
}
