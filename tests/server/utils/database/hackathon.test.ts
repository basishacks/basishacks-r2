import { createMockEvent } from "./helpers";
import { getHackathon } from "~~/server/utils/database/hackathon";

describe("hackathon database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
    });

    describe("getHackathon", () => {
        it("returns the hackathon row when one exists", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'in_progress', 100, 200, 300, 400, 500)",
                )
                .run();

            const hackathon = await getHackathon(event);
            expect(hackathon).not.toBeNull();
            expect(hackathon!.id).toBe(1);
            expect(hackathon!.status).toBe("in_progress");
            expect(hackathon!.start_timestamp).toBe(100);
            expect(hackathon!.end_timestamp).toBe(200);
        });

        it("returns null when no hackathon row exists", async () => {
            const hackathon = await getHackathon(event);
            expect(hackathon).toBeNull();
        });
    });
});
