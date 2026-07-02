import type { H3Event } from "h3";
import { eq, asc } from "drizzle-orm";
import { oauth2Applications } from "~~/server/database/schema";
import { createHash, randomBytes } from "node:crypto";

const MAX_APPLICATIONS_PER_USER = 2;

export async function getOAuth2ApplicationCountByOwner(
    event: H3Event,
    ownerId: number,
): Promise<number> {
    const rows = event.context.drizzle
        .select()
        .from(oauth2Applications)
        .where(eq(oauth2Applications.owner_id, ownerId))
        .all();

    return rows.length;
}

export async function createOAuth2Application(
    event: H3Event,
    ownerId: number,
    name: string,
    description: string | null,
    proxyMicrosoft: boolean,
    type: "first" | "third" = "third",
): Promise<OAuth2Application> {
    const client_id = crypto.randomUUID();

    event.context.drizzle
        .insert(oauth2Applications)
        .values({
            client_id,
            client_secret: "",
            name,
            description,
            proxy_microsoft: proxyMicrosoft ? 1 : 0,
            type,
            owner_id: ownerId,
        })
        .run();

    return {
        client_id,
        client_secret: "",
        name,
        description,
        proxy_microsoft: proxyMicrosoft ? 1 : 0,
        type,
        redirect_uris: null,
        permissions: null,
        profile_picture: null,
        owner_id: ownerId,
    };
}

export async function getOAuth2Application(
    event: H3Event,
    clientID: string,
): Promise<OAuth2Application | null> {
    const row = event.context.drizzle
        .select()
        .from(oauth2Applications)
        .where(eq(oauth2Applications.client_id, clientID))
        .get();

    return row ?? null;
}

export async function getAllOAuth2Applications(event: H3Event): Promise<OAuth2Application[]> {
    return event.context.drizzle
        .select()
        .from(oauth2Applications)
        .orderBy(asc(oauth2Applications.name))
        .all();
}

export async function deleteOAuth2Applications(event: H3Event, clientIDs: string[]) {
    for (const id of clientIDs) {
        event.context.drizzle
            .delete(oauth2Applications)
            .where(eq(oauth2Applications.client_id, id))
            .run();
    }
}

// --- Secret management using the space-separated client_secret column ---

export function abbreviateSecretHash(hash: string): string {
    return `sha256:${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export async function getOAuth2ApplicationSecretAbbreviated(
    event: H3Event,
    clientID: string,
): Promise<string[]> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.client_secret) return [];

    const parts = app.client_secret.split(" ").filter((h) => h);
    return parts.filter((p) => /^[a-f0-9]{64}$/i.test(p)).map(abbreviateSecretHash);
}

export async function addOAuth2ApplicationSecret(
    event: H3Event,
    clientID: string,
): Promise<{ plainSecret: string }> {
    const plainSecret = randomBytes(32).toString("hex");
    const secretHash = createHash("sha256").update(plainSecret).digest("hex");

    return event.context.drizzle.transaction((tx) => {
        const app = tx
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, clientID))
            .get();
        const existing = app?.client_secret ? app.client_secret.split(" ").filter((h) => h) : [];
        const newValue = [...existing, secretHash].join(" ");

        tx.update(oauth2Applications)
            .set({ client_secret: newValue })
            .where(eq(oauth2Applications.client_id, clientID))
            .run();

        return { plainSecret };
    });
}

export async function removeOAuth2ApplicationSecret(
    event: H3Event,
    clientID: string,
    abbreviated: string,
): Promise<void> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.client_secret) {
        throw createError({ status: 404, message: "No secrets found" });
    }

    const parts = app.client_secret.split(" ").filter((h) => h);
    const match = abbreviated.match(/^sha256:([a-f0-9]{8})\.\.\.([a-f0-9]{8})$/i);

    if (!match) {
        throw createError({ status: 400, message: "Invalid abbreviated secret format" });
    }

    const prefix = match[1]!;
    const suffix = match[2]!;
    const newParts = parts.filter((p) => !(p.startsWith(prefix) && p.endsWith(suffix)));

    if (newParts.length === parts.length) {
        throw createError({ status: 404, message: "Secret not found" });
    }

    event.context.drizzle
        .update(oauth2Applications)
        .set({ client_secret: newParts.join(" ") || "" })
        .where(eq(oauth2Applications.client_id, clientID))
        .run();
}

export async function validateOAuth2ApplicationSecret(
    event: H3Event,
    clientID: string,
    plainSecret: string,
): Promise<boolean> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.client_secret) return false;

    const parts = app.client_secret.split(" ").filter((h) => h);

    for (const part of parts) {
        if (/^[a-f0-9]{64}$/i.test(part)) {
            const hash = createHash("sha256").update(plainSecret).digest("hex");
            if (part === hash) return true;
        } else {
            if (part === plainSecret) return true;
        }
    }

    return false;
}

// --- Redirect URI management using the space-separated redirect_uris column ---

export async function getOAuth2ApplicationRedirectUris(
    event: H3Event,
    clientID: string,
): Promise<string[]> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.redirect_uris) return [];
    return app.redirect_uris.split(" ").filter((u) => u);
}

export async function addOAuth2ApplicationRedirectUri(
    event: H3Event,
    clientID: string,
    uri: string,
): Promise<void> {
    event.context.drizzle.transaction((tx) => {
        const app = tx
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, clientID))
            .get();
        const existing = app?.redirect_uris ? app.redirect_uris.split(" ").filter((u) => u) : [];

        if (existing.includes(uri)) {
            throw createError({ status: 409, message: "Redirect URI already exists" });
        }

        const newValue = [...existing, uri].join(" ");

        tx.update(oauth2Applications)
            .set({ redirect_uris: newValue })
            .where(eq(oauth2Applications.client_id, clientID))
            .run();
    });
}

export async function removeOAuth2ApplicationRedirectUri(
    event: H3Event,
    clientID: string,
    uri: string,
): Promise<void> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.redirect_uris) {
        throw createError({ status: 404, message: "No redirect URIs found" });
    }

    const existing = app.redirect_uris.split(" ").filter((u) => u);
    const newValue = existing.filter((u) => u !== uri);

    if (newValue.length === existing.length) {
        throw createError({ status: 404, message: "Redirect URI not found" });
    }

    event.context.drizzle
        .update(oauth2Applications)
        .set({ redirect_uris: newValue.join(" ") || null })
        .where(eq(oauth2Applications.client_id, clientID))
        .run();
}

// --- Scope management using the space-separated permissions column ---

export async function getOAuth2ApplicationScopes(
    event: H3Event,
    clientID: string,
): Promise<string[]> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.permissions) return [];
    return app.permissions.split(" ").filter((s) => s);
}

export async function addOAuth2ApplicationScopes(
    event: H3Event,
    clientID: string,
    scopes: string[],
): Promise<void> {
    event.context.drizzle.transaction((tx) => {
        const app = tx
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, clientID))
            .get();
        const existing = app?.permissions ? app.permissions.split(" ").filter((s) => s) : [];
        const combined = [...existing];
        for (const s of scopes) {
            if (!combined.includes(s)) combined.push(s);
        }

        tx.update(oauth2Applications)
            .set({ permissions: combined.join(" ") || null })
            .where(eq(oauth2Applications.client_id, clientID))
            .run();
    });
}

export async function removeOAuth2ApplicationScope(
    event: H3Event,
    clientID: string,
    scope: string,
): Promise<void> {
    const app = await getOAuth2Application(event, clientID);
    if (!app || !app.permissions) {
        throw createError({ status: 404, message: "No scopes found" });
    }

    const existing = app.permissions.split(" ").filter((s) => s);
    const newValue = existing.filter((s) => s !== scope);

    if (newValue.length === existing.length) {
        throw createError({ status: 404, message: "Scope not found" });
    }

    event.context.drizzle
        .update(oauth2Applications)
        .set({ permissions: newValue.join(" ") || null })
        .where(eq(oauth2Applications.client_id, clientID))
        .run();
}

export { MAX_APPLICATIONS_PER_USER };
