import { describe, it, expect } from "vitest";
import { buildUserInfoClaims } from "~~/server/utils/oauth2-userinfo";

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 7,
        email: "u@basischina.com",
        name: "User Seven",
        profile_picture: "https://example.com/p.png",
        role: "participant",
        team_id: null,
        ...overrides,
    } as User;
}

describe("buildUserInfoClaims", () => {
    it("always includes sub", () => {
        expect(buildUserInfoClaims(makeUser(), [])).toEqual({ sub: "7" });
    });

    it("adds profile claims when profile scope is present", () => {
        expect(buildUserInfoClaims(makeUser(), ["profile"])).toEqual({
            sub: "7",
            name: "User Seven",
            picture: "https://example.com/p.png",
        });
    });

    it("adds email claims when email scope is present", () => {
        expect(buildUserInfoClaims(makeUser(), ["email"])).toEqual({
            sub: "7",
            email: "u@basischina.com",
            email_verified: true,
        });
    });

    it("combines profile and email scopes", () => {
        expect(buildUserInfoClaims(makeUser(), ["openid", "profile", "email"])).toEqual({
            sub: "7",
            name: "User Seven",
            picture: "https://example.com/p.png",
            email: "u@basischina.com",
            email_verified: true,
        });
    });
});
