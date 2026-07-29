/**
 * OAuth2 authorization-code → access_token integration test.
 *
 * Security note
 * -------------
 * This file intentionally does **not** add any production shortcut around
 * Microsoft login. The real authorize UI still requires Entra ID.
 *
 * The only "skip" is here in the test: after a normal authorize session is
 * built (user still null), the test attaches a seeded DB user to the
 * in-memory AuthorizeSession — the same state mscallback would set after a
 * successful Microsoft login. That mutation is process-local to Vitest and
 * cannot be invoked by HTTP clients.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "../helpers";
import {
    createOAuth2Application,
    addOAuth2ApplicationSecret,
    addOAuth2ApplicationRedirectUri,
    addOAuth2ApplicationScopes,
    getOAuth2Application,
} from "~~/server/utils/database/oauth2_applications";
import { verifyAccessToken } from "~~/server/utils/oauth2-jwt";

const REDIRECT_URI = "https://client.example/callback";
const SCOPES = "openid profile email";
const JWT_SECRET = "token-flow-test-secret-at-least-32b!!";
const ISSUER = "http://localhost:3000";

let ctx: TestContext;
let tokenHandler: (event: any) => Promise<any>;
let userinfoHandler: (event: any) => Promise<any>;
let constructSession: typeof import("~~/server/api/oauth2/session.post").constructSession;
let addAuthorizeSession: typeof import("~~/server/api/oauth2/session.post").addAuthorizeSession;
let completeAuthorizeSession: typeof import("~~/server/api/oauth2/session.post").completeAuthorizeSession;
let generateExchangeCode: typeof import("~~/server/api/oauth2/session.post").generateExchangeCode;

const sessionTokens: string[] = [];
const headerState: Record<string, string | undefined> = {};

function s256(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
}

function createEvent() {
    return { context: { drizzle: ctx.drizzle } } as any;
}

beforeAll(async () => {
    process.env.NUXT_OAUTH2_JWT_SECRET = JWT_SECRET;
    process.env.CURRENT_URL_ORIGIN = ISSUER;

    setupNitroGlobals();

    // token.post uses getRequestHeader + readRawBody (JSON path uses readBody).
    vi.stubGlobal("getRequestHeader", (_event: any, name: string) => {
        return headerState[name.toLowerCase()] ?? headerState[name];
    });
    vi.stubGlobal("getHeader", (_event: any, name: string) => {
        return headerState[name.toLowerCase()] ?? headerState[name];
    });
    vi.stubGlobal("readRawBody", async () => mockBody.value);

    const sessionMod = await import("~~/server/api/oauth2/session.post");
    constructSession = sessionMod.constructSession;
    addAuthorizeSession = sessionMod.addAuthorizeSession;
    completeAuthorizeSession = sessionMod.completeAuthorizeSession;
    generateExchangeCode = sessionMod.generateExchangeCode;

    tokenHandler = (await import("~~/server/api/oauth2/token.post")).default;
    userinfoHandler = (await import("~~/server/api/oauth2/userinfo.get")).default;
});

beforeEach(async () => {
    resetMockState();
    Object.keys(headerState).forEach((k) => delete headerState[k]);
    ctx = await createTestContext();
    seedHackathon(ctx);
    seedSeason(ctx);
});

afterEach(() => {
    for (const token of sessionTokens.splice(0)) {
        completeAuthorizeSession(token);
    }
    resetTestContext(ctx);
});

async function provisionClientApp(ownerId: number) {
    const event = createEvent();
    const created = await createOAuth2Application(event, ownerId, "Token Flow App", null, false);
    const { plainSecret } = await addOAuth2ApplicationSecret(event, created.client_id);
    await addOAuth2ApplicationRedirectUri(event, created.client_id, REDIRECT_URI);
    await addOAuth2ApplicationScopes(event, created.client_id, SCOPES.split(" "));
    const app = (await getOAuth2Application(event, created.client_id))!;
    return { app, plainSecret };
}

/**
 * Builds a completed authorize session the way production does after Microsoft
 * login + consent — except the user attachment is done in-test (see file header).
 */
function buildCompletedSession(app: any, user: any, codeVerifier: string) {
    const session = constructSession(
        REDIRECT_URI,
        app,
        "client-state-xyz",
        s256(codeVerifier),
        "S256",
        SCOPES,
    );

    // Production sets these in mscallback / consent handlers only.
    expect(session.user).toBeNull();
    expect(session.login_state).toBe("identification");

    session.user = user;
    session.login_state = "completed";

    addAuthorizeSession(session);
    sessionTokens.push(session.token);
    generateExchangeCode(session);

    expect(session.code).toBeTruthy();
    return session;
}

describe("OAuth2 code → access_token flow (no production MS bypass)", () => {
    it("exchanges a post-consent code via POST /api/oauth2/token and serves userinfo", async () => {
        const user = seedUser(ctx, {
            email: "flow-user@basischina.com",
            name: "Flow User",
        });
        const { app, plainSecret } = await provisionClientApp(user.id);

        const codeVerifier = randomBytes(32).toString("base64url");
        const session = buildCompletedSession(app, user, codeVerifier);
        const code = session.code!;

        headerState["content-type"] = "application/json";
        mockBody.value = {
            grant_type: "authorization_code",
            code,
            client_id: app.client_id,
            client_secret: plainSecret,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        };

        const tokenResponse = await tokenHandler(createEvent());

        expect(tokenResponse).toMatchObject({
            token_type: "Bearer",
            expires_in: 3600,
        });
        expect(typeof tokenResponse.access_token).toBe("string");
        expect(tokenResponse.access_token.split(".")).toHaveLength(3);

        const payload = await verifyAccessToken(tokenResponse.access_token);
        expect(payload.sub).toBe(String(user.id));
        expect(payload.user_id).toBe(user.id);
        expect(payload.client_id).toBe(app.client_id);
        expect(payload.redirect_uri).toBe(REDIRECT_URI);
        expect(payload.scope).toBe(SCOPES);
        expect(payload.iss).toBe(ISSUER);
        expect(payload.aud).toBe(app.client_id);

        headerState["authorization"] = `Bearer ${tokenResponse.access_token}`;
        const claims = await userinfoHandler(createEvent());

        expect(claims).toEqual({
            sub: String(user.id),
            name: "Flow User",
            picture: user.profile_picture ?? null,
            email: "flow-user@basischina.com",
            email_verified: true,
        });
    });

    it("accepts application/x-www-form-urlencoded token requests", async () => {
        const user = seedUser(ctx, { email: "form@basischina.com", name: "Form User" });
        const { app, plainSecret } = await provisionClientApp(user.id);
        const codeVerifier = randomBytes(32).toString("base64url");
        const session = buildCompletedSession(app, user, codeVerifier);

        headerState["content-type"] = "application/x-www-form-urlencoded";
        mockBody.value = new URLSearchParams({
            grant_type: "authorization_code",
            code: session.code!,
            client_id: app.client_id,
            client_secret: plainSecret,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        }).toString();

        const tokenResponse = await tokenHandler(createEvent());
        expect(tokenResponse.token_type).toBe("Bearer");
        expect(typeof tokenResponse.access_token).toBe("string");
    });

    it("rejects token exchange when the authorize session has no user (MS login not completed)", async () => {
        const user = seedUser(ctx, { email: "nouser@basischina.com" });
        const { app, plainSecret } = await provisionClientApp(user.id);

        const codeVerifier = randomBytes(32).toString("base64url");
        const session = constructSession(
            REDIRECT_URI,
            app,
            "state",
            s256(codeVerifier),
            "S256",
            SCOPES,
        );
        // Deliberately leave session.user = null (pre-login).
        addAuthorizeSession(session);
        sessionTokens.push(session.token);
        generateExchangeCode(session);

        headerState["content-type"] = "application/json";
        mockBody.value = {
            grant_type: "authorization_code",
            code: session.code!,
            client_id: app.client_id,
            client_secret: plainSecret,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        };

        await expect(tokenHandler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_grant",
        });
    });

    it("rejects wrong client_secret", async () => {
        const user = seedUser(ctx, { email: "badsecret@basischina.com" });
        const { app } = await provisionClientApp(user.id);
        const codeVerifier = randomBytes(32).toString("base64url");
        const session = buildCompletedSession(app, user, codeVerifier);

        headerState["content-type"] = "application/json";
        mockBody.value = {
            grant_type: "authorization_code",
            code: session.code!,
            client_id: app.client_id,
            client_secret: "definitely-not-the-real-secret",
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        };

        await expect(tokenHandler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_client",
        });
    });

    it("rejects wrong PKCE code_verifier", async () => {
        const user = seedUser(ctx, { email: "badpkce@basischina.com" });
        const { app, plainSecret } = await provisionClientApp(user.id);
        const codeVerifier = randomBytes(32).toString("base64url");
        const session = buildCompletedSession(app, user, codeVerifier);

        headerState["content-type"] = "application/json";
        mockBody.value = {
            grant_type: "authorization_code",
            code: session.code!,
            client_id: app.client_id,
            client_secret: plainSecret,
            redirect_uri: REDIRECT_URI,
            code_verifier: "wrong-verifier-value",
        };

        await expect(tokenHandler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_grant",
        });
    });
});
