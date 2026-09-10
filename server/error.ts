import { APIError } from "@basis/schema/api";
import { send, setResponseHeader, setResponseStatus } from "h3";

const errorNameForStatus = (status: number, statusMessage?: string) => {
    if (statusMessage === "invalid_token" || statusMessage === "insufficient_scope") {
        return statusMessage;
    }
    if (status === 400) return "invalid_request";
    if (status === 401) return "invalid_token";
    if (status === 403) return "forbidden";
    if (status === 404) return "not_found";
    if (status === 409) return "conflict";
    if (status === 429) return "rate_limited";
    return "server_error";
};

export default defineNitroErrorHandler((input, event) => {
    const original = (input.cause ?? input) as any;
    const status = original.status ?? original.statusCode ?? input.statusCode ?? 500;
    const isSafe = status < 500;
    const apiError =
        original instanceof APIError
            ? original
            : new APIError(
                  errorNameForStatus(status, original.statusMessage ?? input.statusMessage),
                  isSafe
                      ? original.message || input.message || "The request is invalid"
                      : "The request could not be completed",
                  status,
              );

    if (!isSafe) console.error("Unhandled API error", input);
    setResponseStatus(event, apiError.status);
    setResponseHeader(event, "content-type", "application/json; charset=utf-8");
    setResponseHeader(event, "cache-control", "no-store");
    return send(event, JSON.stringify(apiError.toJSON()));
});
