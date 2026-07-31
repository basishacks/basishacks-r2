import { describe, it, expect } from "vitest";
import { convertUserToPublic, convertTeamToPublic } from "~~/server/utils/convert";

describe("convert utilities", () => {
    it("convertUserToPublic keeps numeric ids and parses profile theme", () => {
        const user: any = {
            id: 42,
            email: "test@example.com",
            role: "participant",
            name: "Test User",
            team_id: 7,
            profile_theme: "gradient|blue",
            profile_picture: null,
        };

        const result = convertUserToPublic(user);
        expect(result.id).toBe(42);
        expect(typeof result.id).toBe("number");
        expect(result.profile_theme).toEqual({ mode: "gradient", value: "blue" });
    });

    it("convertTeamToPublic coerces project_submitted to boolean and includes awards", () => {
        const team: any = {
            id: 1,
            name: "Team A",
            pathway: "senior",
            rank: 2,
            score: 95,
            season_id: 1,
            project_name: "P",
            project_description: "desc",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: null,
        };

        const result = convertTeamToPublic(team, { withScore: true }, [
            { id: 1, team_id: 1, text: ["Best", "Design"], created_at: 0 },
        ] as any);
        expect(result.id).toBe(1);
        expect(result.project.submitted).toBe(true);
        expect(result.awards[0].text).toBe("Best, Design");
    });

    it("convertTeamToPublic hides score and rank unless requested", () => {
        const team: any = {
            id: 1,
            name: "Team A",
            pathway: "senior",
            rank: 2,
            score: 95,
            season_id: 1,
            project_name: "P",
            project_description: "desc",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: null,
        };

        const hidden = convertTeamToPublic(team, { withRank: false });
        expect(hidden.score).toBeNull();
        expect(hidden.rank).toBeNull();

        const shown = convertTeamToPublic(team, { withScore: true, withRank: true });
        expect(shown.score).toBe(95);
        expect(shown.rank).toBe(2);

        const rankOnly = convertTeamToPublic(team);
        expect(rankOnly.score).toBeNull();
        expect(rankOnly.rank).toBe(2);
    });

    it("parseProfileTheme preserves the full value when it contains pipes", () => {
        const user: any = {
            id: 1,
            email: "a@b.com",
            role: "participant",
            name: null,
            team_id: null,
            profile_theme: "url|http://example.com/image?a=1|b=2",
            profile_picture: null,
        };
        const result = convertUserToPublic(user);
        expect(result.profile_theme).toEqual({
            mode: "url",
            value: "http://example.com/image?a=1|b=2",
        });
    });

    // --- convertUserToPublic additional tests ---

    it("convertUserToPublic returns null for null name", () => {
        const user: any = {
            id: 1,
            email: "a@b.com",
            role: "participant",
            name: null,
            team_id: 5,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).name).toBeNull();
    });

    it("convertUserToPublic returns null for null team_id", () => {
        const user: any = {
            id: 2,
            email: "b@c.com",
            role: "participant",
            name: "Bob",
            team_id: null,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).team_id).toBeNull();
    });

    it("convertUserToPublic returns emoji fallback for null profile_theme", () => {
        const user: any = {
            id: 3,
            email: "c@d.com",
            role: "participant",
            name: "Carol",
            team_id: 1,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "emoji", value: "" });
    });

    it("convertUserToPublic returns null for null profile_picture", () => {
        const user: any = {
            id: 4,
            email: "d@e.com",
            role: "participant",
            name: "Dave",
            team_id: 2,
            profile_theme: "url|img.png",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_picture).toBeNull();
    });

    it("convertUserToPublic parses profile_theme mode url|value", () => {
        const user: any = {
            id: 5,
            email: "e@f.com",
            role: "participant",
            name: "Eve",
            team_id: 3,
            profile_theme: "url|https://cdn.example.com/avatar.png",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({
            mode: "url",
            value: "https://cdn.example.com/avatar.png",
        });
    });

    it("convertUserToPublic parses profile_theme mode emoji|value", () => {
        const user: any = {
            id: 6,
            email: "f@g.com",
            role: "participant",
            name: "Frank",
            team_id: 4,
            profile_theme: "emoji|🚀",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "emoji", value: "🚀" });
    });

    it("convertUserToPublic parses profile_theme mode gradient|value", () => {
        const user: any = {
            id: 7,
            email: "g@h.com",
            role: "participant",
            name: "Grace",
            team_id: 5,
            profile_theme: "gradient|#667eea-#764ba2",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({
            mode: "gradient",
            value: "#667eea-#764ba2",
        });
    });

    it("convertUserToPublic falls back to emoji for empty profile_theme string", () => {
        const user: any = {
            id: 8,
            email: "h@i.com",
            role: "participant",
            name: "Heidi",
            team_id: 6,
            profile_theme: "",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "emoji", value: "" });
    });

    it("convertUserToPublic handles undefined profile_theme", () => {
        const user: any = {
            id: 9,
            email: "i@j.com",
            role: "participant",
            name: "Ivan",
            team_id: 7,
            profile_picture: null,
        };
        delete user.profile_theme;
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "emoji", value: "" });
    });

    it("convertUserToPublic preserves email", () => {
        const user: any = {
            id: 10,
            email: "preserved@test.com",
            role: "participant",
            name: "Judy",
            team_id: 8,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).email).toBe("preserved@test.com");
    });

    it("convertUserToPublic preserves role participant", () => {
        const user: any = {
            id: 11,
            email: "k@l.com",
            role: "participant",
            name: "Karl",
            team_id: 9,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).role).toBe("participant");
    });

    it("convertUserToPublic preserves role admin", () => {
        const user: any = {
            id: 12,
            email: "m@n.com",
            role: "admin",
            name: "Mallory",
            team_id: 10,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).role).toBe("admin");
    });

    it("convertUserToPublic preserves role judge", () => {
        const user: any = {
            id: 13,
            email: "o@p.com",
            role: "judge",
            name: "Oscar",
            team_id: 11,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).role).toBe("judge");
    });

    it("convertUserToPublic keeps id as number", () => {
        const user: any = {
            id: 99,
            email: "q@r.com",
            role: "participant",
            name: "Peggy",
            team_id: 12,
            profile_theme: null,
            profile_picture: null,
        };
        const result = convertUserToPublic(user);
        expect(result.id).toBe(99);
        expect(typeof result.id).toBe("number");
    });

    it("convertUserToPublic handles empty string name", () => {
        const user: any = {
            id: 14,
            email: "s@t.com",
            role: "participant",
            name: "",
            team_id: 13,
            profile_theme: null,
            profile_picture: null,
        };
        expect(convertUserToPublic(user).name).toBe("");
    });

    it("convertUserToPublic preserves profile_picture string value", () => {
        const user: any = {
            id: 15,
            email: "u@v.com",
            role: "participant",
            name: "Sybil",
            team_id: 14,
            profile_theme: null,
            profile_picture: "users/abc123.png",
        };
        expect(convertUserToPublic(user).profile_picture).toBe("users/abc123.png");
    });

    it("convertUserToPublic preserves team_id as number", () => {
        const user: any = {
            id: 16,
            email: "w@x.com",
            role: "participant",
            name: "Trent",
            team_id: 42,
            profile_theme: null,
            profile_picture: null,
        };
        const result = convertUserToPublic(user);
        expect(result.team_id).toBe(42);
        expect(typeof result.team_id).toBe("number");
    });

    it("convertUserToPublic includes all expected fields", () => {
        const user: any = {
            id: 17,
            email: "y@z.com",
            role: "participant",
            name: "Walter",
            team_id: 15,
            profile_theme: "emoji|🔥",
            profile_picture: "pic.png",
        };
        const result = convertUserToPublic(user);
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("email");
        expect(result).toHaveProperty("role");
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("team_id");
        expect(result).toHaveProperty("profile_theme");
        expect(result).toHaveProperty("profile_picture");
    });

    // --- convertTeamToPublic additional tests ---

    it("convertTeamToPublic project_submitted=0 coerces to false", () => {
        const team: any = {
            id: 10,
            name: "Team J",
            pathway: "senior",
            rank: 1,
            score: 100,
            season_id: 1,
            project_name: "P",
            project_description: "D",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: "",
        };
        expect(convertTeamToPublic(team).project.submitted).toBe(false);
    });

    it("convertTeamToPublic project_submitted=1 coerces to true", () => {
        const team: any = {
            id: 11,
            name: "Team K",
            pathway: "junior",
            rank: 2,
            score: 90,
            season_id: 1,
            project_name: "Q",
            project_description: "E",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: "internal",
        };
        expect(convertTeamToPublic(team).project.submitted).toBe(true);
    });

    it("convertTeamToPublic returns null demo_url", () => {
        const team: any = {
            id: 12,
            name: "Team L",
            pathway: "senior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: "R",
            project_description: "F",
            project_demo_url: null,
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).project.demo_url).toBeNull();
    });

    it("convertTeamToPublic returns null repo_url", () => {
        const team: any = {
            id: 13,
            name: "Team M",
            pathway: "junior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: "S",
            project_description: "G",
            project_demo_url: "https://demo",
            project_repo_url: null,
            project_submitted: 1,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).project.repo_url).toBeNull();
    });

    it("convertTeamToPublic with withScore=true shows score and no awards", () => {
        const team: any = {
            id: 14,
            name: "Team N",
            pathway: "senior",
            rank: 3,
            score: 85,
            season_id: 1,
            project_name: "T",
            project_description: "H",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        const result = convertTeamToPublic(team, true);
        expect(result.score).toBe(85);
        expect(result.awards).toEqual([]);
    });

    it("convertTeamToPublic without withScore flag defaults score to null", () => {
        const team: any = {
            id: 15,
            name: "Team O",
            pathway: "junior",
            rank: 4,
            score: 80,
            season_id: 1,
            project_name: "U",
            project_description: "I",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        const result = convertTeamToPublic(team);
        expect(result.score).toBeNull();
        expect(result.awards).toEqual([]);
    });

    it("convertTeamToPublic with neither score nor awards", () => {
        const team: any = {
            id: 16,
            name: "Team P",
            pathway: "senior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: "V",
            project_description: "J",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        const result = convertTeamToPublic(team, true);
        expect(result.score).toBeNull();
        expect(result.awards).toEqual([]);
    });

    it("convertTeamToPublic handles multiple awards", () => {
        const team: any = {
            id: 17,
            name: "Team Q",
            pathway: "junior",
            rank: 1,
            score: 95,
            season_id: 1,
            project_name: "W",
            project_description: "K",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: "docs",
        };
        const awards = [
            { id: 1, team_id: 17, text: ["Best", "Design"], created_at: 0 } as any,
            { id: 2, team_id: 17, text: ["Most", "Innovative"], created_at: 1 } as any,
        ];
        const result = convertTeamToPublic(team, true, awards);
        expect(result.awards).toHaveLength(2);
        expect(result.awards[0].text).toBe("Best, Design");
        expect(result.awards[1].text).toBe("Most, Innovative");
    });

    it("convertTeamToPublic handles empty awards array", () => {
        const team: any = {
            id: 18,
            name: "Team R",
            pathway: "senior",
            rank: 2,
            score: 70,
            season_id: 1,
            project_name: "X",
            project_description: "L",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 1,
            sourcing: null,
        };
        expect(convertTeamToPublic(team, true, []).awards).toEqual([]);
    });

    it("convertTeamToPublic returns null sourcing", () => {
        const team: any = {
            id: 19,
            name: "Team S",
            pathway: "junior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: "Y",
            project_description: "M",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).project.sourcing).toBeNull();
    });

    it("convertTeamToPublic handles all null project fields", () => {
        const team: any = {
            id: 20,
            name: "Team T",
            pathway: "senior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: null,
            project_description: null,
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        const result = convertTeamToPublic(team);
        expect(result.project.name).toBeNull();
        expect(result.project.description).toBeNull();
        expect(result.project.demo_url).toBeNull();
        expect(result.project.repo_url).toBeNull();
        expect(result.project.submitted).toBe(false);
        expect(result.project.sourcing).toBeNull();
    });

    it("convertTeamToPublic preserves pathway junior", () => {
        const team: any = {
            id: 21,
            name: "Team U",
            pathway: "junior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: null,
            project_description: null,
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).pathway).toBe("junior");
    });

    it("convertTeamToPublic preserves pathway senior", () => {
        const team: any = {
            id: 22,
            name: "Team V",
            pathway: "senior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: null,
            project_description: null,
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).pathway).toBe("senior");
    });

    it("convertTeamToPublic returns null rank", () => {
        const team: any = {
            id: 23,
            name: "Team W",
            pathway: "junior",
            rank: null,
            score: null,
            season_id: 1,
            project_name: "Z",
            project_description: "N",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 0,
            sourcing: null,
        };
        expect(convertTeamToPublic(team).rank).toBeNull();
    });

    it("convertTeamToPublic returns null project_name", () => {
        const team: any = {
            id: 24,
            name: "Team X",
            pathway: "senior",
            rank: 5,
            score: 60,
            season_id: 1,
            project_name: null,
            project_description: "O",
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 1,
            sourcing: "",
        };
        expect(convertTeamToPublic(team).project.name).toBeNull();
    });

    it("convertTeamToPublic returns null project_description", () => {
        const team: any = {
            id: 25,
            name: "Team Y",
            pathway: "junior",
            rank: 6,
            score: 55,
            season_id: 1,
            project_name: "Zeta",
            project_description: null,
            project_demo_url: null,
            project_repo_url: null,
            project_submitted: 1,
            sourcing: "",
        };
        expect(convertTeamToPublic(team).project.description).toBeNull();
    });

    it("convertTeamToPublic includes all expected team fields", () => {
        const team: any = {
            id: 26,
            name: "Team Z",
            pathway: "senior",
            rank: 7,
            score: 75,
            season_id: 1,
            project_name: "P",
            project_description: "D",
            project_demo_url: "https://demo",
            project_repo_url: "https://repo",
            project_submitted: 1,
            sourcing: "git",
        };
        const result = convertTeamToPublic(team, true);
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("pathway");
        expect(result).toHaveProperty("rank");
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("season_id");
        expect(result).toHaveProperty("project");
        expect(result).toHaveProperty("awards");
        expect(result.project).toHaveProperty("name");
        expect(result.project).toHaveProperty("description");
        expect(result.project).toHaveProperty("demo_url");
        expect(result.project).toHaveProperty("repo_url");
        expect(result.project).toHaveProperty("submitted");
        expect(result.project).toHaveProperty("sourcing");
    });

    // --- parseProfileTheme edge cases via convertUserToPublic ---

    it("parseProfileTheme invalid mode falls back to emoji", () => {
        const user: any = {
            id: 100,
            email: "inval@id.com",
            role: "participant",
            name: "Inv",
            team_id: null,
            profile_theme: "invalid|somevalue",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({
            mode: "emoji",
            value: "somevalue",
        });
    });

    it("parseProfileTheme string without pipe separator falls back to emoji with empty value", () => {
        const user: any = {
            id: 101,
            email: "no@p.pe",
            role: "participant",
            name: "NoPipe",
            team_id: null,
            profile_theme: "justtext",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "emoji", value: "" });
    });

    it("parseProfileTheme empty after pipe keeps value as empty string", () => {
        const user: any = {
            id: 102,
            email: "empty@val.com",
            role: "participant",
            name: "EmptyVal",
            team_id: null,
            profile_theme: "url|",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({ mode: "url", value: "" });
    });

    it("parseProfileTheme gradient with complex value", () => {
        const user: any = {
            id: 103,
            email: "grad@ient.com",
            role: "participant",
            name: "Grad",
            team_id: null,
            profile_theme: "gradient|linear-gradient(45deg, #f00 0%, #00f 100%)",
            profile_picture: null,
        };
        expect(convertUserToPublic(user).profile_theme).toEqual({
            mode: "gradient",
            value: "linear-gradient(45deg, #f00 0%, #00f 100%)",
        });
    });
});
