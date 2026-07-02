import {
    createSession,
    getDeepSeekSession,
    getAllSessions,
    deleteSession,
    addMessage,
    getMessages,
} from "~~/server/utils/deepseek-store";

// ---------------------------------------------------------------------------
// The deepseek-store module maintains in-memory state (a Map and a counter).
// We need to reset the module between tests to avoid state leakage.
// Since we can't easily reset module-level variables, we clear sessions
// by deleting all of them before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
    // Delete all existing sessions to start fresh
    const allSessions = getAllSessions();
    for (const session of allSessions) {
        deleteSession(session.id);
    }
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

describe("createSession", () => {
    it("creates a session with auto-incrementing ID starting from 1", () => {
        const session1 = createSession("First Session");
        const session2 = createSession("Second Session");

        expect(session1.id).toBeGreaterThan(0);
        expect(session2.id).toBe(session1.id + 1);
    });

    it("sets the correct session name", () => {
        const session = createSession("My Chat");

        expect(session.sessionName).toBe("My Chat");
    });

    it("initializes with an empty messages array", () => {
        const session = createSession("Empty Chat");

        expect(session.messages).toEqual([]);
    });

    it("sets a numeric createdAt timestamp", () => {
        const before = Math.floor(Date.now() / 1000);
        const session = createSession("Timestamped");
        const after = Math.floor(Date.now() / 1000);

        expect(session.createdAt).toBeGreaterThanOrEqual(before);
        expect(session.createdAt).toBeLessThanOrEqual(after);
    });

    it("returns the full session object", () => {
        const session = createSession("Full Check");

        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("sessionName");
        expect(session).toHaveProperty("createdAt");
        expect(session).toHaveProperty("messages");
    });
});

// ---------------------------------------------------------------------------
// getDeepSeekSession
// ---------------------------------------------------------------------------

describe("getDeepSeekSession", () => {
    it("retrieves an existing session by ID", () => {
        const created = createSession("Retrieve Me");
        const retrieved = getDeepSeekSession(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.sessionName).toBe("Retrieve Me");
    });

    it("returns undefined for a non-existing session", () => {
        const result = getDeepSeekSession(9999);

        expect(result).toBeUndefined();
    });

    it("returns undefined for session ID 0", () => {
        const result = getDeepSeekSession(0);

        expect(result).toBeUndefined();
    });

    it("returns undefined for a negative session ID", () => {
        const result = getDeepSeekSession(-1);

        expect(result).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// getAllSessions
// ---------------------------------------------------------------------------

describe("getAllSessions", () => {
    it("returns an empty array when no sessions exist", () => {
        const result = getAllSessions();

        expect(result).toEqual([]);
    });

    it("returns all created sessions", () => {
        createSession("Session A");
        createSession("Session B");
        createSession("Session C");

        const result = getAllSessions();

        expect(result).toHaveLength(3);
        expect(result.map((s) => s.sessionName)).toEqual(["Session A", "Session B", "Session C"]);
    });

    it("returns a single session when only one exists", () => {
        createSession("Lonely Session");

        const result = getAllSessions();

        expect(result).toHaveLength(1);
        expect(result[0].sessionName).toBe("Lonely Session");
    });
});

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------

describe("deleteSession", () => {
    it("returns true when deleting an existing session", () => {
        const session = createSession("Delete Me");
        const result = deleteSession(session.id);

        expect(result).toBe(true);
    });

    it("returns false when deleting a non-existing session", () => {
        const result = deleteSession(404);

        expect(result).toBe(false);
    });

    it("actually removes the session from the store", () => {
        const session = createSession("Gone Forever");
        deleteSession(session.id);

        const retrieved = getDeepSeekSession(session.id);
        expect(retrieved).toBeUndefined();
    });

    it("does not affect other sessions when deleting one", () => {
        const session1 = createSession("Keep Me");
        const session2 = createSession("Delete Me");
        deleteSession(session2.id);

        const all = getAllSessions();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe(session1.id);
    });
});

// ---------------------------------------------------------------------------
// addMessage
// ---------------------------------------------------------------------------

describe("addMessage", () => {
    it("adds a message to an existing session and returns the session", () => {
        const session = createSession("Chat");
        const message = { role: "user" as const, content: "Hello!" };

        const updated = addMessage(session.id, message);

        expect(updated).toBeDefined();
        expect(updated!.messages).toHaveLength(1);
        expect(updated!.messages[0]).toEqual(message);
    });

    it("returns undefined when adding a message to a non-existing session", () => {
        const message = { role: "user" as const, content: "Nobody here" };

        const result = addMessage(9999, message);

        expect(result).toBeUndefined();
    });

    it("preserves existing messages when adding a new one", () => {
        const session = createSession("Multi-Message");
        addMessage(session.id, { role: "user" as const, content: "First" });
        addMessage(session.id, { role: "assistant" as const, content: "Second" });

        const retrieved = getDeepSeekSession(session.id);
        expect(retrieved!.messages).toHaveLength(2);
        expect(retrieved!.messages[0].content).toBe("First");
        expect(retrieved!.messages[1].content).toBe("Second");
    });

    it("can add messages with tool calls", () => {
        const session = createSession("Tool Chat");
        const message = {
            role: "assistant" as const,
            content: null,
            tool_calls: [
                {
                    id: "call_1",
                    type: "function" as const,
                    function: { name: "get_weather", arguments: '{"city":"NYC"}' },
                },
            ],
        };

        const updated = addMessage(session.id, message);

        expect(updated!.messages).toHaveLength(1);
        expect(updated!.messages[0]).toEqual(message);
    });

    it("caps message history at MAX_MESSAGES_PER_SESSION (200)", () => {
        const session = createSession("Cap Chat");
        // Add 205 messages; only the last 200 should be retained
        for (let i = 0; i < 205; i++) {
            addMessage(session.id, { role: "user" as const, content: `msg-${i}` });
        }

        const messages = getMessages(session.id);
        expect(messages).toHaveLength(200);
        // The first 5 messages (msg-0 .. msg-4) should have been evicted
        expect(messages[0]!.content).toBe("msg-5");
        expect(messages[messages.length - 1]!.content).toBe("msg-204");
    });
});

// ---------------------------------------------------------------------------
// getMessages
// ---------------------------------------------------------------------------

describe("getMessages", () => {
    it("returns all messages for an existing session", () => {
        const session = createSession("Chatty");
        addMessage(session.id, { role: "user" as const, content: "Hi" });
        addMessage(session.id, { role: "assistant" as const, content: "Hello!" });

        const messages = getMessages(session.id);

        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe("user");
        expect(messages[1].role).toBe("assistant");
    });

    it("returns an empty array for a non-existing session", () => {
        const messages = getMessages(12345);

        expect(messages).toEqual([]);
    });

    it("returns an empty array for a session with no messages yet", () => {
        const session = createSession("Silent");

        const messages = getMessages(session.id);

        expect(messages).toEqual([]);
    });

    it("returns messages in insertion order", () => {
        const session = createSession("Ordered");
        addMessage(session.id, { role: "system" as const, content: "You are helpful." });
        addMessage(session.id, { role: "user" as const, content: "A" });
        addMessage(session.id, { role: "user" as const, content: "B" });
        addMessage(session.id, { role: "assistant" as const, content: "C" });

        const messages = getMessages(session.id);

        expect(messages.map((m) => m.content)).toEqual(["You are helpful.", "A", "B", "C"]);
    });

    it("returns a copy, not the internal array reference", () => {
        const session = createSession("Copy Check");
        addMessage(session.id, { role: "user" as const, content: "original" });

        const first = getMessages(session.id);
        const second = getMessages(session.id);

        // Each call returns a distinct array instance
        expect(first).not.toBe(second);
        expect(first).toEqual(second);

        // Mutating the returned array must not affect subsequent calls
        first.push({ role: "user" as const, content: "injected" });
        const third = getMessages(session.id);
        expect(third).toHaveLength(1);
        expect(third[0]!.content).toBe("original");
    });
});

// ---------------------------------------------------------------------------
// MAX_SESSIONS eviction
// ---------------------------------------------------------------------------

describe("MAX_SESSIONS eviction", () => {
    it("evicts the oldest session when creating a new one at capacity (100)", () => {
        // Fill the store up to the maximum of 100 sessions
        const created = [];
        for (let i = 0; i < 100; i++) {
            created.push(createSession(`Session ${i}`));
        }
        expect(getAllSessions()).toHaveLength(100);

        const oldestId = created[0]!.id;
        expect(getDeepSeekSession(oldestId)).toBeDefined();

        // Creating one more should evict the oldest session
        const overflow = createSession("Overflow Session");
        expect(getDeepSeekSession(overflow.id)).toBeDefined();
        expect(getDeepSeekSession(oldestId)).toBeUndefined();

        // Total count should remain at the cap
        expect(getAllSessions()).toHaveLength(100);
    });
});
