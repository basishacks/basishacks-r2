export type DateInput = Date | string | number | null | undefined;

/**
 * Converts values commonly returned by APIs and form controls into a valid
 * native Date. Invalid or missing values are represented as null so callers
 * never invoke Date methods on an incompatible value.
 */
export function toValidDate(value: DateInput): Date | null {
    if (value === null || value === undefined || value === "") return null;

    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
