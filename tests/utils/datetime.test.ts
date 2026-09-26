import { describe, expect, it } from "vitest";
import { toValidDate } from "~/app/utils/datetime";

describe("toValidDate", () => {
    it("accepts native Date instances, ISO strings, and epoch milliseconds", () => {
        const expected = "2026-01-02T03:04:05.000Z";

        expect(toValidDate(new Date(expected))?.toISOString()).toBe(expected);
        expect(toValidDate(expected)?.toISOString()).toBe(expected);
        expect(toValidDate(Date.parse(expected))?.toISOString()).toBe(expected);
    });

    it("returns null for invalid and absent values instead of exposing toISOString errors", () => {
        expect(toValidDate("not a date")).toBeNull();
        expect(toValidDate(new Date("not a date"))).toBeNull();
        expect(toValidDate(null)).toBeNull();
        expect(toValidDate(undefined)).toBeNull();
    });
});
