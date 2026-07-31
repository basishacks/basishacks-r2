import { describe, it, expect, beforeEach } from "vitest";
import { createMockEvent } from "./helpers";
import {
    getUser,
    getUserByEmail,
    createUserForEmail,
    updateUserName,
    updateUserProfileTheme,
    updateUserProfilePicture,
    updateUserRole,
    deleteUsers,
} from "~~/server/utils/database/users";

describe("users database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
    });

    describe("getUser", () => {
        it("returns the user when the user exists", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email, name) VALUES('test@example.com', 'Test User')")
                .run();

            const user = await getUser(event, 1);
            expect(user).not.toBeNull();
            expect(user!.email).toBe("test@example.com");
            expect(user!.name).toBe("Test User");
        });

        it("returns null when the user does not exist", async () => {
            const user = await getUser(event, 999);
            expect(user).toBeNull();
        });
    });

    describe("getUserByEmail", () => {
        it("returns the user when found by email (case insensitive)", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email, name) VALUES('test@example.com', 'Test User')")
                .run();

            const user = await getUserByEmail(event, "TEST@EXAMPLE.COM");
            expect(user).not.toBeNull();
            expect(user!.email).toBe("test@example.com");
        });

        it("returns null when no user has the given email", async () => {
            const user = await getUserByEmail(event, "nobody@example.com");
            expect(user).toBeNull();
        });
    });

    describe("createUserForEmail", () => {
        it("creates a new user", async () => {
            const user = await createUserForEmail(event, "NEW@example.com");
            expect(user).not.toBeNull();
            expect(user.email).toBe("new@example.com");
        });

        it("returns the existing user", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email, role) VALUES('existing@example.com', 'admin')")
                .run();

            const user = await createUserForEmail(event, "EXISTING@example.com");
            expect(user.id).toBe(1);
            expect(user.role).toBe("admin");
        });
    });

    describe("updateUserName", () => {
        it("updates the user name successfully", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email, name) VALUES('user@example.com', 'Old Name')")
                .run();

            await updateUserName(event, {
                id: 1,
                name: "New Name",
            } as any);

            const user = await getUser(event, 1);
            expect(user!.name).toBe("New Name");
        });

        it("throws a 404 error when the user does not exist", async () => {
            await expect(updateUserName(event, { id: 999, name: "Ghost" } as any)).rejects.toThrow(
                "User not found",
            );
        });
    });

    describe("updateUserProfileTheme", () => {
        it("updates the profile theme successfully", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user@example.com')")
                .run();

            await updateUserProfileTheme(event, {
                id: 1,
                profile_theme: "dark|blue",
            } as any);

            const user = await getUser(event, 1);
            expect(user!.profile_theme).toBe("dark|blue");
        });

        it("throws a 404 error when the user does not exist", async () => {
            await expect(
                updateUserProfileTheme(event, {
                    id: 999,
                    profile_theme: "dark|blue",
                } as any),
            ).rejects.toThrow("User not found");
        });
    });

    describe("updateUserProfilePicture", () => {
        it("updates the profile picture successfully", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user@example.com')")
                .run();

            await updateUserProfilePicture(event, {
                id: 1,
                profile_picture: "/avatars/test.png",
            } as any);

            const user = await getUser(event, 1);
            expect(user!.profile_picture).toBe("/avatars/test.png");
        });

        it("throws a 404 error when the user does not exist", async () => {
            await expect(
                updateUserProfilePicture(event, {
                    id: 999,
                    profile_picture: "/avatars/test.png",
                } as any),
            ).rejects.toThrow("User not found");
        });
    });

    describe("updateUserRole", () => {
        it("updates the user role successfully", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email, role) VALUES('user@example.com', 'participant')")
                .run();

            await updateUserRole(event, 1, "judge");

            const user = await getUser(event, 1);
            expect(user!.role).toBe("judge");
        });

        it("throws a 404 error when the user does not exist", async () => {
            await expect(updateUserRole(event, 999, "admin")).rejects.toThrow("User not found");
        });
    });

    describe("deleteUsers", () => {
        it("deletes a single user", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user@example.com')")
                .run();

            await deleteUsers(event, [1]);

            const user = await getUser(event, 1);
            expect(user).toBeNull();
        });

        it("deletes multiple users", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user1@example.com')")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user2@example.com')")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user3@example.com')")
                .run();

            await deleteUsers(event, [1, 3]);

            expect(await getUser(event, 1)).toBeNull();
            expect(await getUser(event, 2)).not.toBeNull();
            expect(await getUser(event, 3)).toBeNull();
        });

        it("cleans up related records when deleting a user", async () => {
            // Insert a hackathon row for FK constraints
            event.context.drizzle
                .prepare(
                    "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
                )
                .run();

            // Insert a season and team
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('S1', 1)")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO teams(name, season_id) VALUES('Team A', 1)")
                .run();

            // Insert user
            event.context.drizzle
                .prepare("INSERT INTO users(id, email) VALUES(1, 'user@example.com')")
                .run();

            // Create a ballot and team_scores entry for the user
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id) VALUES(1, 1)")
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_scores(team_id, judge_user_id, scores) VALUES(1, 1, '{}')",
                )
                .run();
            event.context.drizzle
                .prepare("INSERT INTO user_past_teams(user_id, team_id) VALUES(1, 1)")
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO peer_voting_scores(user_id, score, reasoning) VALUES(1, '{}', 'nice')",
                )
                .run();
            event.context.drizzle
                .prepare("INSERT INTO sc_votes(user_id, vote) VALUES(1, 'yes')")
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO oauth2_applications(client_id, client_secret, name, owner_id) VALUES('client-1', '', 'App', 1)",
                )
                .run();

            await deleteUsers(event, [1]);

            // User should be gone
            expect(await getUser(event, 1)).toBeNull();

            // Related records should be cleaned up
            const teamScores = event.context.drizzle
                .prepare("SELECT * FROM team_scores WHERE judge_user_id = 1")
                .all() as { results: any[] };
            expect(teamScores.results).toHaveLength(0);

            const ballots = event.context.drizzle
                .prepare("SELECT * FROM ballots WHERE user_id = 1")
                .all() as { results: any[] };
            expect(ballots.results).toHaveLength(0);

            const ballotScores = event.context.drizzle
                .prepare("SELECT * FROM ballot_scores WHERE ballot_id = 1")
                .all() as { results: any[] };
            expect(ballotScores.results).toHaveLength(0);

            const pastTeams = event.context.drizzle
                .prepare("SELECT * FROM user_past_teams WHERE user_id = 1")
                .all() as { results: any[] };
            expect(pastTeams.results).toHaveLength(0);

            const peerVotes = event.context.drizzle
                .prepare("SELECT * FROM peer_voting_scores WHERE user_id = 1")
                .all() as { results: any[] };
            expect(peerVotes.results).toHaveLength(0);

            const apps = event.context.drizzle
                .prepare("SELECT * FROM oauth2_applications WHERE owner_id = 1")
                .all() as { results: any[] };
            expect(apps.results).toHaveLength(0);
        });
    });
});
