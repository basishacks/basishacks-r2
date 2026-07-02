import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "~~/server/database/schema";

declare module "h3" {
    interface H3EventContext {
        /** Drizzle ORM instance (driver-agnostic; backed by bun:sqlite or better-sqlite3) */
        drizzle: BaseSQLiteDatabase<"sync", any, typeof schema>;
    }
}

export default {};
