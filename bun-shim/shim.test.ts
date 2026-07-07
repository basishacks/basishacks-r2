// Shim executed by `bun test`.
//
// This project uses Vitest for testing. Bun's native test runner cannot resolve
// Nuxt's `~~/` and `~/` path aliases (configured in vitest.config.ts) and the
// test files import their assertions from `vitest` rather than `bun:test`.
//
// Run the real suite with:  bun run test
//
// This file lives outside the `tests/` directory on purpose so that Vitest
// (whose `include` is `tests/**/*.test.ts`) does not try to load it.
import { test, expect } from "bun:test";

test("use bun run test", () => {
    console.log("\n========================================");
    console.log(" This project uses Vitest for testing.  ");
    console.log(" Bun test cannot resolve Nuxt path       ");
    console.log(" aliases (~~/ and ~/), and the test      ");
    console.log(' files import from "vitest" directly.    ');
    console.log("                                         ");
    console.log(" Run the suite with:  bun run test       ");
    console.log("========================================\n");
    expect(true).toBe(true);
});
