import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { H3Event } from "h3";
import { and, eq, lt } from "drizzle-orm";
import { basisAuthSessions } from "~~/server/database/schema";

export interface StoredBasisAuthTokens {
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
}

const TOKEN_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ENCRYPTION_VERSION = "v1";

function getEncryptionKey() {
    const password = process.env.NUXT_SESSION_PASSWORD;
    if (!password) {
        throw createError({ statusCode: 500, message: "NUXT_SESSION_PASSWORD is not set" });
    }
    return createHash("sha256").update(`basishacks:basis-auth:${password}`).digest();
}

function encryptTokens(tokens: StoredBasisAuthTokens): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(tokens), "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
        ENCRYPTION_VERSION,
        iv.toString("base64url"),
        tag.toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}

function decryptTokens(value: string): StoredBasisAuthTokens {
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
    if (
        version !== ENCRYPTION_VERSION ||
        !encodedIv ||
        !encodedTag ||
        !encodedCiphertext ||
        extra
    ) {
        throw new Error("Invalid stored basis-auth token payload");
    }

    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64url")),
        decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Partial<StoredBasisAuthTokens>;
    if (
        typeof parsed.accessToken !== "string" ||
        typeof parsed.accessTokenExpiresAt !== "number" ||
        typeof parsed.refreshToken !== "string"
    ) {
        throw new Error("Invalid stored basis-auth token data");
    }
    return parsed as StoredBasisAuthTokens;
}

export function saveBasisAuthSession(
    event: H3Event,
    sessionId: string,
    userId: number,
    tokens: StoredBasisAuthTokens,
) {
    const encryptedTokens = encryptTokens(tokens);
    const expiresAt = Date.now() + TOKEN_SESSION_MAX_AGE_MS;
    // Opportunistic cleanup keeps abandoned sessions from accumulating without
    // making a successful login depend on the cleanup query.
    try {
        event.context.drizzle
            .delete(basisAuthSessions)
            .where(lt(basisAuthSessions.expires_at, Date.now()))
            .run();
    } catch {
        // The upsert below remains authoritative and will surface real DB errors.
    }
    event.context.drizzle
        .insert(basisAuthSessions)
        .values({
            session_id: sessionId,
            user_id: userId,
            encrypted_tokens: encryptedTokens,
            expires_at: expiresAt,
        })
        .onConflictDoUpdate({
            target: basisAuthSessions.session_id,
            set: {
                user_id: userId,
                encrypted_tokens: encryptedTokens,
                expires_at: expiresAt,
            },
        })
        .run();
}

export function getBasisAuthSession(
    event: H3Event,
    sessionId: string,
    userId: number,
): StoredBasisAuthTokens | undefined {
    const row = event.context.drizzle
        .select()
        .from(basisAuthSessions)
        .where(
            and(eq(basisAuthSessions.session_id, sessionId), eq(basisAuthSessions.user_id, userId)),
        )
        .get();
    if (row && row.expires_at < Date.now()) {
        deleteBasisAuthSession(event, sessionId);
        return undefined;
    }
    return row ? decryptTokens(row.encrypted_tokens) : undefined;
}

export function deleteBasisAuthSession(event: H3Event, sessionId: string) {
    event.context.drizzle
        .delete(basisAuthSessions)
        .where(eq(basisAuthSessions.session_id, sessionId))
        .run();
}
