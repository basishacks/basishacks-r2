import { electionPositions } from "~~/server/utils/election";

// ---------------------------------------------------------------------------
// electionPositions
// ---------------------------------------------------------------------------

describe("electionPositions", () => {
    it("is a non-empty array", () => {
        expect(Array.isArray(electionPositions)).toBe(true);
        expect(electionPositions.length).toBeGreaterThan(0);
    });

    it("contains exactly 6 positions", () => {
        expect(electionPositions).toHaveLength(6);
    });

    describe("each position", () => {
        it("has a title string", () => {
            for (const position of electionPositions) {
                expect(position).toHaveProperty("title");
                expect(typeof position.title).toBe("string");
                expect(position.title.length).toBeGreaterThan(0);
            }
        });

        it("has a candidates array", () => {
            for (const position of electionPositions) {
                expect(position).toHaveProperty("candidates");
                expect(Array.isArray(position.candidates)).toBe(true);
                expect(position.candidates.length).toBeGreaterThan(0);
            }
        });

        it("has the expected position titles", () => {
            const titles = electionPositions.map((p) => p.title);
            expect(titles).toContain("President");
            expect(titles).toContain("Vice President");
            expect(titles).toContain("Treasurer");
            expect(titles).toContain("Secretary");
            expect(titles).toContain("Activities Coordinator");
            expect(titles).toContain("Director of Communications");
        });
    });

    describe("each candidate", () => {
        it("has an id string", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    expect(candidate).toHaveProperty("id");
                    expect(typeof candidate.id).toBe("string");
                    expect(candidate.id.length).toBeGreaterThan(0);
                }
            }
        });

        it("has a shortName string", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    expect(candidate).toHaveProperty("shortName");
                    expect(typeof candidate.shortName).toBe("string");
                    expect(candidate.shortName.length).toBeGreaterThan(0);
                }
            }
        });

        it("has a fullName string", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    expect(candidate).toHaveProperty("fullName");
                    expect(typeof candidate.fullName).toBe("string");
                    expect(candidate.fullName.length).toBeGreaterThan(0);
                }
            }
        });

        it("has an email string", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    expect(candidate).toHaveProperty("email");
                    expect(typeof candidate.email).toBe("string");
                    expect(candidate.email.length).toBeGreaterThan(0);
                }
            }
        });
    });

    describe("candidate uniqueness", () => {
        it("has no duplicate candidate IDs within the same position", () => {
            for (const position of electionPositions) {
                const ids = position.candidates.map((c) => c.id);
                const uniqueIds = new Set(ids);
                expect(uniqueIds.size).toBe(ids.length);
            }
        });

        it("has no duplicate candidate IDs across all positions", () => {
            const allIds = electionPositions.flatMap((p) => p.candidates.map((c) => c.id));
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);
        });

        it("has no duplicate candidate emails across all positions", () => {
            const allEmails = electionPositions.flatMap((p) =>
                p.candidates.map((c) => c.email.toLowerCase()),
            );
            const uniqueEmails = new Set(allEmails);
            expect(uniqueEmails.size).toBe(allEmails.length);
        });
    });

    describe("email validation", () => {
        it("all candidate emails end with @basischina.com", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    expect(candidate.email.toLowerCase()).toMatch(/@basischina\.com$/);
                }
            }
        });

        it("emails contain the candidate ID", () => {
            for (const position of electionPositions) {
                for (const candidate of position.candidates) {
                    // Emails are expected to contain the candidate's ID number
                    expect(candidate.email).toContain(candidate.id);
                }
            }
        });
    });

    describe("specific position counts", () => {
        it("President has exactly 1 candidate", () => {
            const president = electionPositions.find((p) => p.title === "President");
            expect(president).toBeDefined();
            expect(president!.candidates).toHaveLength(1);
        });

        it("Vice President has 3 candidates", () => {
            const vp = electionPositions.find((p) => p.title === "Vice President");
            expect(vp).toBeDefined();
            expect(vp!.candidates).toHaveLength(3);
        });

        it("Treasurer has 6 candidates", () => {
            const treasurer = electionPositions.find((p) => p.title === "Treasurer");
            expect(treasurer).toBeDefined();
            expect(treasurer!.candidates).toHaveLength(6);
        });

        it("Secretary has 6 candidates", () => {
            const secretary = electionPositions.find((p) => p.title === "Secretary");
            expect(secretary).toBeDefined();
            expect(secretary!.candidates).toHaveLength(6);
        });

        it("Activities Coordinator has 5 candidates", () => {
            const ac = electionPositions.find((p) => p.title === "Activities Coordinator");
            expect(ac).toBeDefined();
            expect(ac!.candidates).toHaveLength(5);
        });

        it("Director of Communications has 4 candidates", () => {
            const doc = electionPositions.find((p) => p.title === "Director of Communications");
            expect(doc).toBeDefined();
            expect(doc!.candidates).toHaveLength(4);
        });
    });
});
