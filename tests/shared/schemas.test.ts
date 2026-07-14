import { describe, it, expect } from "vitest";
import {
    MicrosoftRedirectRequest,
    CreateTeamQuery,
    GetTeamsQuery,
    CreateTeamRequest,
    UpdateTeamRequest,
    SubmitTeamRequest,
    AddTeamMemberRequest,
    UpdateUserRequest,
    CreateTeamScoresRequest,
    SubmitVoteRequest,
    CreateApplicationRequest,
    ManageRedirectUriRequest,
    OAuth2TokenRequest,
    OAuth2SessionActionRequest,
    SetActiveSeasonRequest,
    ElectionVoteRequest,
    ApplicationIdParams,
    TeamIdParams,
    UserIdParams,
    DeepSeekSessionIdParams,
    formatBytes,
} from "~~/shared/schemas";

describe("MicrosoftRedirectRequest", () => {
    it("accepts a valid token", () => {
        expect(() => MicrosoftRedirectRequest.parse({ token: "abc123" })).not.toThrow();
    });

    it("accepts a long token", () => {
        expect(() => MicrosoftRedirectRequest.parse({ token: "a".repeat(1000) })).not.toThrow();
    });

    it("rejects an empty token", () => {
        expect(() => MicrosoftRedirectRequest.parse({ token: "" })).toThrow();
    });

    it("rejects a missing token", () => {
        expect(() => MicrosoftRedirectRequest.parse({})).toThrow();
    });
});

describe("CreateTeamQuery", () => {
    it("accepts add=true", () => {
        const result = CreateTeamQuery.parse({ add: "true" });
        expect(result.add).toBe(true);
    });

    it("accepts add=false", () => {
        const result = CreateTeamQuery.parse({ add: "false" });
        expect(result.add).toBe(false);
    });

    it("has add as undefined when missing", () => {
        const result = CreateTeamQuery.parse({});
        expect(result.add).toBeUndefined();
    });

    it("rejects add with an invalid value", () => {
        expect(() => CreateTeamQuery.parse({ add: "yes" })).toThrow();
    });
});

describe("CreateTeamRequest", () => {
    it("accepts a valid team name", () => {
        expect(() => CreateTeamRequest.parse({ name: "My Team" })).not.toThrow();
    });

    it("accepts a 2-character name", () => {
        expect(() => CreateTeamRequest.parse({ name: "AB" })).not.toThrow();
    });

    it("accepts a 30-character name", () => {
        expect(() => CreateTeamRequest.parse({ name: "A".repeat(30) })).not.toThrow();
    });

    it("rejects a name shorter than 2 characters", () => {
        expect(() => CreateTeamRequest.parse({ name: "A" })).toThrow();
    });

    it("rejects a name longer than 30 characters", () => {
        expect(() => CreateTeamRequest.parse({ name: "A".repeat(31) })).toThrow();
    });

    it("rejects an empty name", () => {
        expect(() => CreateTeamRequest.parse({ name: "" })).toThrow();
    });
});

describe("UpdateTeamRequest", () => {
    it("accepts a valid name update", () => {
        expect(() => UpdateTeamRequest.parse({ name: "New Name" })).not.toThrow();
    });

    it("accepts a valid pathway update", () => {
        expect(() => UpdateTeamRequest.parse({ pathway: "junior" })).not.toThrow();
        expect(() => UpdateTeamRequest.parse({ pathway: "senior" })).not.toThrow();
    });

    it("accepts an empty object", () => {
        expect(() => UpdateTeamRequest.parse({})).not.toThrow();
    });

    it("rejects an invalid pathway", () => {
        expect(() => UpdateTeamRequest.parse({ pathway: "intermediate" })).toThrow();
    });

    it("accepts a valid project update", () => {
        expect(() =>
            UpdateTeamRequest.parse({
                project: {
                    name: "My Project",
                    description: "A description",
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).not.toThrow();
    });

    it("transforms an empty string URL to null", () => {
        const result = UpdateTeamRequest.parse({
            project: {
                demo_url: "",
                repo_url: "",
            },
        });
        expect(result.project?.demo_url).toBeNull();
        expect(result.project?.repo_url).toBeNull();
    });

    it("preserves null and undefined URLs", () => {
        const resultWithNull = UpdateTeamRequest.parse({
            project: {
                demo_url: null,
                repo_url: undefined,
            },
        });
        expect(resultWithNull.project?.demo_url).toBeNull();
        expect(resultWithNull.project?.repo_url).toBeUndefined();
    });

    it("rejects a project name longer than 100 characters", () => {
        expect(() => UpdateTeamRequest.parse({ project: { name: "A".repeat(101) } })).toThrow();
    });

    it("rejects a project description longer than 2000 characters", () => {
        expect(() =>
            UpdateTeamRequest.parse({ project: { description: "A".repeat(2001) } }),
        ).toThrow();
    });

    it("rejects an invalid demo URL", () => {
        expect(() => UpdateTeamRequest.parse({ project: { demo_url: "not-a-url" } })).toThrow();
    });

    it("rejects a demo URL longer than 2048 characters", () => {
        expect(() =>
            UpdateTeamRequest.parse({
                project: { demo_url: "https://example.com/" + "a".repeat(2048) },
            }),
        ).toThrow();
    });

    it("rejects sourcing notes longer than 2000 characters", () => {
        expect(() =>
            UpdateTeamRequest.parse({ project: { sourcing: "A".repeat(2001) } }),
        ).toThrow();
    });
});

describe("SubmitTeamRequest", () => {
    it("accepts a valid submission", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).not.toThrow();
    });

    it("rejects a submission with missing project name", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "",
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a submission with too short description", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "Too short",
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a submission with invalid demo URL", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "not-a-url",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a submission with invalid repo URL", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "not-a-url",
                },
            }),
        ).toThrow();
    });

    it("rejects a submission with missing pathway", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a project name longer than 100 characters", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "A".repeat(101),
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a project description longer than 2000 characters", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(2001),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects a demo URL longer than 2048 characters", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "https://example.com/" + "a".repeat(2048),
                    repo_url: "https://github.com/user/repo",
                },
            }),
        ).toThrow();
    });

    it("rejects sourcing notes longer than 2000 characters", () => {
        expect(() =>
            SubmitTeamRequest.parse({
                pathway: "junior",
                project: {
                    name: "Cool Project",
                    description: "A".repeat(30),
                    demo_url: "https://example.com",
                    repo_url: "https://github.com/user/repo",
                    sourcing: "A".repeat(2001),
                },
            }),
        ).toThrow();
    });
});

describe("AddTeamMemberRequest", () => {
    it("accepts a valid @basischina.com email", () => {
        expect(() => AddTeamMemberRequest.parse({ email: "member@basischina.com" })).not.toThrow();
    });

    it("rejects a non-basis email", () => {
        expect(() => AddTeamMemberRequest.parse({ email: "member@gmail.com" })).toThrow();
    });

    it("rejects an invalid email format", () => {
        expect(() => AddTeamMemberRequest.parse({ email: "not-an-email" })).toThrow();
    });

    it("rejects an email longer than 254 characters", () => {
        const longLocal = "a".repeat(250);
        expect(() =>
            AddTeamMemberRequest.parse({ email: `${longLocal}@basischina.com` }),
        ).toThrow();
    });
});

describe("UpdateUserRequest", () => {
    it("accepts a valid name update", () => {
        expect(() => UpdateUserRequest.parse({ name: "John Doe" })).not.toThrow();
    });

    it("accepts an empty object (no fields)", () => {
        expect(() => UpdateUserRequest.parse({})).not.toThrow();
    });

    it("accepts a profile_theme_image as null", () => {
        expect(() => UpdateUserRequest.parse({ profile_theme_image: null })).not.toThrow();
    });

    it("accepts a profile_theme_image as a data string", () => {
        expect(() =>
            UpdateUserRequest.parse({ profile_theme_image: "data:image/png;base64,abc" }),
        ).not.toThrow();
    });

    it("accepts a profile_theme_image as a valid File", () => {
        const file = new File([new Uint8Array([1, 2, 3])], "theme.png", { type: "image/png" });
        expect(() => UpdateUserRequest.parse({ profile_theme_image: file })).not.toThrow();
    });

    it("rejects a profile_theme_image File that is too large", () => {
        const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "theme.png", {
            type: "image/png",
        });
        expect(() => UpdateUserRequest.parse({ profile_theme_image: file })).toThrow(
            "smaller than 10 MB",
        );
    });

    it("rejects a profile_theme_image File with an invalid type", () => {
        const file = new File([new Uint8Array([1, 2, 3])], "theme.gif", { type: "image/gif" });
        expect(() => UpdateUserRequest.parse({ profile_theme_image: file })).toThrow(
            "valid image file",
        );
    });

    it("accepts an avatar as null", () => {
        expect(() => UpdateUserRequest.parse({ avatar: null })).not.toThrow();
    });

    it("accepts an avatar as a data string", () => {
        expect(() =>
            UpdateUserRequest.parse({ avatar: "data:image/png;base64,abc" }),
        ).not.toThrow();
    });

    it("accepts an avatar as a valid File", () => {
        const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", { type: "image/png" });
        expect(() => UpdateUserRequest.parse({ avatar: file })).not.toThrow();
    });

    it("rejects an avatar File that is too large", () => {
        const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "avatar.png", {
            type: "image/png",
        });
        expect(() => UpdateUserRequest.parse({ avatar: file })).toThrow("smaller than 10 MB");
    });

    it("rejects an avatar File with an invalid type", () => {
        const file = new File([new Uint8Array([1, 2, 3])], "avatar.gif", { type: "image/gif" });
        expect(() => UpdateUserRequest.parse({ avatar: file })).toThrow("valid image file");
    });

    it("rejects an avatar that is not a data string, null, or File", () => {
        expect(() => UpdateUserRequest.parse({ avatar: "not-data-or-file" })).toThrow();
    });

    it("rejects a name longer than 30 characters", () => {
        expect(() => UpdateUserRequest.parse({ name: "A".repeat(31) })).toThrow();
    });

    it("rejects a profile_theme_image that is not a data string, null, or File", () => {
        expect(() =>
            UpdateUserRequest.parse({ profile_theme_image: "not-data-or-file" }),
        ).toThrow();
    });
});

describe("CreateTeamScoresRequest", () => {
    const validScores = {
        originality: 3,
        presentation: 3,
        technicality: 3,
        theme: 3,
        impact: 3,
    };

    it("accepts valid scores with reasoning", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "Good work overall",
                scores: validScores,
            }),
        ).not.toThrow();
    });

    it("rejects reasoning shorter than 10 characters", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "Short",
                scores: validScores,
            }),
        ).toThrow();
    });

    it("rejects reasoning longer than 2000 characters", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "A".repeat(2001),
                scores: validScores,
            }),
        ).toThrow();
    });

    it("rejects a score below 0", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "Good work overall",
                scores: { ...validScores, originality: -1 },
            }),
        ).toThrow();
    });

    it("rejects a score above 5", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "Good work overall",
                scores: { ...validScores, originality: 6 },
            }),
        ).toThrow();
    });

    it("rejects missing rubric fields", () => {
        expect(() =>
            CreateTeamScoresRequest.parse({
                reasoning: "Good work overall",
                scores: { originality: 3 },
            }),
        ).toThrow();
    });
});

describe("SubmitVoteRequest", () => {
    it("accepts scores that sum to exactly 10", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [5, 5],
                reasoning: "Great work",
            }),
        ).not.toThrow();

        expect(() =>
            SubmitVoteRequest.parse({
                scores: [2, 3, 5],
                reasoning: "Great work",
            }),
        ).not.toThrow();
    });

    it("rejects scores that do not sum to 10", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [5, 4],
                reasoning: "Great work",
            }),
        ).toThrow();
    });

    it("rejects empty scores", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [],
                reasoning: "Great work",
            }),
        ).toThrow();
    });

    it("rejects reasoning longer than 2000 characters", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [5, 5],
                reasoning: "A".repeat(2001),
            }),
        ).toThrow();
    });

    it("rejects a score below 0", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [10, -1, 1],
                reasoning: "Great work",
            }),
        ).toThrow();
    });

    it("rejects a score above 5", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [6, 4],
                reasoning: "Great work",
            }),
        ).toThrow();
    });

    it("rejects scores that sum to 12 (schema requires 10)", () => {
        expect(() =>
            SubmitVoteRequest.parse({
                scores: [6, 6],
                reasoning: "Great work",
            }),
        ).toThrow("Stars must sum to 10");
    });

    it("rejects more than 50 scores", () => {
        const scores = Array(51).fill(0);
        scores[0] = 5;
        scores[1] = 5;
        expect(() =>
            SubmitVoteRequest.parse({
                scores,
                reasoning: "Great work",
            }),
        ).toThrow();
    });
});

describe("CreateApplicationRequest", () => {
    it("accepts a valid application", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                proxy_microsoft: false,
            }),
        ).not.toThrow();
    });

    it("accepts a valid application with type", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                proxy_microsoft: false,
                type: "first",
            }),
        ).not.toThrow();

        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                proxy_microsoft: false,
                type: "third",
            }),
        ).not.toThrow();
    });

    it("accepts a valid application with description", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                description: "A useful app",
                proxy_microsoft: false,
            }),
        ).not.toThrow();
    });

    it("rejects a missing name", () => {
        expect(() => CreateApplicationRequest.parse({ proxy_microsoft: false })).toThrow();
    });

    it("rejects an empty name", () => {
        expect(() =>
            CreateApplicationRequest.parse({ name: "", proxy_microsoft: false }),
        ).toThrow();
    });

    it("rejects a name longer than 64 characters", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "A".repeat(65),
                proxy_microsoft: false,
            }),
        ).toThrow();
    });

    it("rejects a description longer than 1024 characters", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                description: "A".repeat(1025),
                proxy_microsoft: false,
            }),
        ).toThrow();
    });

    it("rejects an invalid type", () => {
        expect(() =>
            CreateApplicationRequest.parse({
                name: "My App",
                proxy_microsoft: false,
                type: "second",
            }),
        ).toThrow();
    });
});

describe("ManageRedirectUriRequest", () => {
    it("accepts a valid HTTPS URL", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "https://example.com/callback" }),
        ).not.toThrow();
    });

    it("accepts a localhost URL", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "http://localhost:3000/callback" }),
        ).not.toThrow();
    });

    it("accepts localhost with a path", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "http://localhost/callback" }),
        ).not.toThrow();
    });

    it("accepts localhost with a port", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "http://localhost:8080" }),
        ).not.toThrow();
    });

    it("accepts bare localhost origin", () => {
        expect(() => ManageRedirectUriRequest.parse({ uri: "http://localhost" })).not.toThrow();
    });

    it("rejects http://localhost.evil.com", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "http://localhost.evil.com/callback" }),
        ).toThrow();
    });

    it("rejects a plain HTTP URL", () => {
        expect(() =>
            ManageRedirectUriRequest.parse({ uri: "http://example.com/callback" }),
        ).toThrow();
    });

    it("rejects an invalid URL", () => {
        expect(() => ManageRedirectUriRequest.parse({ uri: "not-a-url" })).toThrow();
    });

    it("rejects an empty string", () => {
        expect(() => ManageRedirectUriRequest.parse({ uri: "" })).toThrow();
    });
});

describe("OAuth2TokenRequest", () => {
    it("accepts a valid token request", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
                client_secret: "my-secret",
            }),
        ).not.toThrow();
    });

    it("accepts optional redirect_uri and code_verifier", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
                client_secret: "my-secret",
                redirect_uri: "https://example.com/callback",
                code_verifier: "verifier123",
            }),
        ).not.toThrow();
    });

    it("rejects a wrong grant_type", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "client_credentials",
                code: "abc123",
                client_id: "my-client",
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects missing code", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                client_id: "my-client",
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects missing client_id", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects missing client_secret", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
            }),
        ).toThrow();
    });

    it("rejects empty code", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "",
                client_id: "my-client",
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects a code longer than 1024 characters", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "a".repeat(1025),
                client_id: "my-client",
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects a client_id longer than 256 characters", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "a".repeat(257),
                client_secret: "my-secret",
            }),
        ).toThrow();
    });

    it("rejects a client_secret longer than 512 characters", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
                client_secret: "a".repeat(513),
            }),
        ).toThrow();
    });

    it("rejects a redirect_uri longer than 2048 characters", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
                client_secret: "my-secret",
                redirect_uri: "https://example.com/" + "a".repeat(2048),
            }),
        ).toThrow();
    });

    it("rejects a code_verifier longer than 128 characters", () => {
        expect(() =>
            OAuth2TokenRequest.parse({
                grant_type: "authorization_code",
                code: "abc123",
                client_id: "my-client",
                client_secret: "my-secret",
                code_verifier: "a".repeat(129),
            }),
        ).toThrow();
    });
});

describe("OAuth2SessionActionRequest", () => {
    it("accepts a valid cancel action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "cancel" })).not.toThrow();
    });

    it("accepts a valid consent action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "consent" })).not.toThrow();
    });

    it("accepts a valid assume_consent action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "assume_consent" })).not.toThrow();
    });

    it("accepts a valid deny action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "deny" })).not.toThrow();
    });

    it("rejects an invalid action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "approve" })).toThrow();
    });

    it("rejects an empty action", () => {
        expect(() => OAuth2SessionActionRequest.parse({ action: "" })).toThrow();
    });
});

describe("SetActiveSeasonRequest", () => {
    it("accepts a valid season_id", () => {
        expect(() => SetActiveSeasonRequest.parse({ season_id: 1 })).not.toThrow();
    });

    it("accepts null season_id", () => {
        expect(() => SetActiveSeasonRequest.parse({ season_id: null })).not.toThrow();
    });

    it("rejects 0 as season_id (not positive)", () => {
        expect(() => SetActiveSeasonRequest.parse({ season_id: 0 })).toThrow();
    });

    it("rejects a negative season_id", () => {
        expect(() => SetActiveSeasonRequest.parse({ season_id: -1 })).toThrow();
    });

    it("rejects a non-integer season_id", () => {
        expect(() => SetActiveSeasonRequest.parse({ season_id: 1.5 })).toThrow();
    });
});

describe("ElectionVoteRequest", () => {
    it("accepts valid votes", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "President",
                        candidates: [
                            { id: "c1", rank: 1 },
                            { id: "c2", rank: 2 },
                        ],
                    },
                ],
            }),
        ).not.toThrow();
    });

    it("accepts candidates with null rank", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "President",
                        candidates: [
                            { id: "c1", rank: null },
                            { id: "c2", rank: 1 },
                        ],
                    },
                ],
            }),
        ).not.toThrow();
    });

    it("accepts empty positions array", () => {
        expect(() => ElectionVoteRequest.parse({ positions: [] })).not.toThrow();
    });

    it("rejects candidates with rank below 1", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "President",
                        candidates: [{ id: "c1", rank: 0 }],
                    },
                ],
            }),
        ).toThrow();
    });

    it("rejects non-integer rank", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "President",
                        candidates: [{ id: "c1", rank: 1.5 }],
                    },
                ],
            }),
        ).toThrow();
    });

    it("rejects more than 20 positions", () => {
        const positions = Array(21).fill({
            title: "Position",
            candidates: [{ id: "c1", rank: 1 }],
        });
        expect(() => ElectionVoteRequest.parse({ positions })).toThrow();
    });

    it("rejects more than 50 candidates in a position", () => {
        const candidates = Array(51).fill({ id: "c1", rank: 1 });
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [{ title: "President", candidates }],
            }),
        ).toThrow();
    });

    it("rejects a position title longer than 128 characters", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "A".repeat(129),
                        candidates: [{ id: "c1", rank: 1 }],
                    },
                ],
            }),
        ).toThrow();
    });

    it("rejects a candidate ID longer than 64 characters", () => {
        expect(() =>
            ElectionVoteRequest.parse({
                positions: [
                    {
                        title: "President",
                        candidates: [{ id: "a".repeat(65), rank: 1 }],
                    },
                ],
            }),
        ).toThrow();
    });
});

describe("GetTeamsQuery", () => {
    it("accepts valid judging and season_id", () => {
        const result = GetTeamsQuery.parse({ judging: "true", season_id: "1" });
        expect(result.judging).toBe(true);
        expect(result.season_id).toBe(1);
    });

    it("accepts an empty query", () => {
        const result = GetTeamsQuery.parse({});
        expect(result.judging).toBeUndefined();
        expect(result.season_id).toBeUndefined();
    });

    it("rejects an invalid season_id", () => {
        expect(() => GetTeamsQuery.parse({ season_id: "not-a-number" })).toThrow();
    });

    it("rejects a non-positive season_id", () => {
        expect(() => GetTeamsQuery.parse({ season_id: "0" })).toThrow();
    });
});

describe("ApplicationIdParams", () => {
    it("accepts a valid client_id", () => {
        expect(() => ApplicationIdParams.parse({ id: "my-client" })).not.toThrow();
    });

    it("rejects an empty client_id", () => {
        expect(() => ApplicationIdParams.parse({ id: "" })).toThrow();
    });

    it("rejects a client_id longer than 256 characters", () => {
        expect(() => ApplicationIdParams.parse({ id: "a".repeat(257) })).toThrow();
    });
});

describe("TeamIdParams", () => {
    it("accepts a positive integer id", () => {
        expect(() => TeamIdParams.parse({ id: "1" })).not.toThrow();
    });

    it("rejects a non-numeric id", () => {
        expect(() => TeamIdParams.parse({ id: "abc" })).toThrow();
    });

    it("rejects a negative id", () => {
        expect(() => TeamIdParams.parse({ id: "-1" })).toThrow();
    });
});

describe("UserIdParams", () => {
    it("accepts a positive integer id", () => {
        expect(() => UserIdParams.parse({ id: "1" })).not.toThrow();
    });

    it("rejects a non-numeric id", () => {
        expect(() => UserIdParams.parse({ id: "abc" })).toThrow();
    });
});

describe("DeepSeekSessionIdParams", () => {
    it("accepts a positive integer id", () => {
        expect(() => DeepSeekSessionIdParams.parse({ id: "1" })).not.toThrow();
    });

    it("rejects a non-numeric id", () => {
        expect(() => DeepSeekSessionIdParams.parse({ id: "abc" })).toThrow();
    });
});

describe("formatBytes", () => {
    it("returns 0 Bytes for zero", () => {
        expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("formats bytes with default decimals", () => {
        expect(formatBytes(1024)).toBe("1 KB");
    });

    it("clamps negative decimals to zero", () => {
        expect(formatBytes(1536, -1)).toBe("2 KB");
    });

    it("uses the requested number of decimals", () => {
        expect(formatBytes(1536, 2)).toBe("1.5 KB");
    });
});
