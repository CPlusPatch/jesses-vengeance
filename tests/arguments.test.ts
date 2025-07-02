import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
    CurrencyArgument,
    NumberArgument,
    StringArgument,
    UserArgument,
} from "../src/classes/arguments.ts";
import type { Event } from "../src/classes/event.ts";
import { User } from "../src/classes/user.ts";
import { mockClient } from "./mocks.ts";

// Mock the client import
mock.module("../index.ts", () => ({
    client: mockClient,
}));

// Mock event for testing
const createMockEvent = (senderMxid = "@sender:matrix.org") =>
    ({
        sender: new User(senderMxid),
        roomId: "!room:matrix.org",
        id: "event_id",
        type: "message" as const,
        content: {},
        sentAt: new Date(),
        inReplyToId: null,
        onReply: mock(() => () => {
            // Mock implementation
        }),
        onReaction: mock(() => () => {
            // Mock implementation
        }),
    }) as Event;

describe("Arguments", () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockClient.client.getUserId.mockReset();
        mockClient.client.getRoomMembers.mockReset();
        mockClient.isUserInRoom.mockReset();

        // Set up default mock returns
        mockClient.client.getUserId.mockResolvedValue("@bot:matrix.org");
        mockClient.client.getRoomMembers.mockResolvedValue([
            {
                sender: "@alice:matrix.org",
                content: { displayname: "Alice" },
            },
            {
                sender: "@bob:matrix.org",
                content: { displayname: "Bob" },
            },
            {
                sender: "@charlie:matrix.org",
                content: { displayname: null },
            },
        ]);
        mockClient.isUserInRoom.mockResolvedValue(true);
    });
    describe("StringArgument", () => {
        test("should validate non-empty string", () => {
            const arg = new StringArgument("test", true);
            expect(arg.validate("hello")).toBe(true);
        });

        test("should reject empty string", () => {
            const arg = new StringArgument("test", true);
            expect(arg.validate("")).toBe(false);
            expect(arg.validate("   ")).toBe(false);
        });

        test("should parse and trim string", () => {
            const arg = new StringArgument("test", true);
            expect(arg.parse("  hello world  ")).toBe("hello world");
        });
    });

    describe("NumberArgument", () => {
        test("should validate valid numbers", () => {
            const arg = new NumberArgument("test", true);
            expect(arg.validate("42")).toBe(true);
            expect(arg.validate("3.14")).toBe(true);
            expect(arg.validate("-10")).toBe(true);
        });

        test("should reject invalid numbers", () => {
            const arg = new NumberArgument("test", true);
            expect(() => arg.validate("abc")).toThrow("is not a valid number");
            expect(() => arg.validate("")).toThrow("is not a valid number");
        });

        test("should validate minimum value", () => {
            const arg = new NumberArgument("test", true, { min: 10 });
            expect(arg.validate("15")).toBe(true);
            expect(() => arg.validate("5")).toThrow(
                "less than the minimum value",
            );
        });

        test("should validate maximum value", () => {
            const arg = new NumberArgument("test", true, { max: 100 });
            expect(arg.validate("50")).toBe(true);
            expect(() => arg.validate("150")).toThrow(
                "greater than the maximum value",
            );
        });

        test("should validate integer constraint", () => {
            const arg = new NumberArgument("test", true, { int: true });
            expect(arg.validate("42")).toBe(true);
            expect(() => arg.validate("3.14")).toThrow("not a valid integer");
        });

        test("should parse numbers correctly", () => {
            const arg = new NumberArgument("test", true);
            expect(arg.parse("42")).toBe(42);
            expect(arg.parse("3.14")).toBe(3.14);
            expect(arg.parse("-10")).toBe(-10);
        });
    });

    describe("CurrencyArgument", () => {
        test("should validate currency values", () => {
            const arg = new CurrencyArgument("amount", true);
            expect(arg.validate("10.50")).toBe(true);
            expect(arg.validate("0")).toBe(true);
        });

        test("should respect min/max constraints", () => {
            const arg = new CurrencyArgument("amount", true, {
                min: 1,
                max: 1000,
            });
            expect(arg.validate("500")).toBe(true);
            expect(() => arg.validate("0")).toThrow(
                "less than the minimum value",
            );
            expect(() => arg.validate("2000")).toThrow(
                "greater than the maximum value",
            );
        });
    });

    describe("UserArgument", () => {
        test("should parse Matrix.to URL to MXID", async () => {
            const arg = new UserArgument("user", true);

            const result = await arg.parse(
                "https://matrix.to/#/@alice:matrix.org",
            );
            expect(result.mxid).toBe("@alice:matrix.org");
        });

        test("should validate Matrix.to URL", async () => {
            const arg = new UserArgument("user", true);
            const event = createMockEvent();

            const isValid = await arg.validate(
                "https://matrix.to/#/@alice:matrix.org",
                event,
            );
            expect(isValid).toBe(true);
        });

        test("should reject bot's own MXID", async () => {
            const arg = new UserArgument("user", true);
            const event = createMockEvent();

            await expect(
                arg.validate("https://matrix.to/#/@bot:matrix.org", event),
            ).rejects.toThrow("Cannot use the MXID of this bot");
        });

        test("should reject sender's MXID by default", async () => {
            const arg = new UserArgument("user", true);
            const event = createMockEvent("@sender:matrix.org");

            await expect(
                arg.validate("https://matrix.to/#/@sender:matrix.org", event),
            ).rejects.toThrow("Cannot use yourself");
        });

        test("should allow sender's MXID when allowSender is true", async () => {
            const arg = new UserArgument("user", true, { allowSender: true });
            const event = createMockEvent("@sender:matrix.org");

            // Mock user in room
            mockClient.isUserInRoom.mockReturnValueOnce(Promise.resolve(true));

            const isValid = await arg.validate(
                "https://matrix.to/#/@sender:matrix.org",
                event,
            );
            expect(isValid).toBe(true);
        });

        test("should validate user in room", async () => {
            const arg = new UserArgument("user", true);
            const event = createMockEvent();

            // Mock user not in room
            mockClient.isUserInRoom.mockReturnValueOnce(Promise.resolve(false));

            await expect(
                arg.validate(
                    "https://matrix.to/#/@notinroom:matrix.org",
                    event,
                ),
            ).rejects.toThrow("is not in the room");
        });

        test("should allow users outside room when canBeOutsideRoom is true", async () => {
            const arg = new UserArgument("user", true, {
                canBeOutsideRoom: true,
            });
            const event = createMockEvent();

            const isValid = await arg.validate(
                "https://matrix.to/#/@outside:matrix.org",
                event,
            );
            expect(isValid).toBe(true);
        });

        test("should parse Matrix.to URL to User", () => {
            const arg = new UserArgument("user", true);

            const result = arg.parse("https://matrix.to/#/@charlie:matrix.org");
            expect(result.mxid).toBe("@charlie:matrix.org");
        });

        test("should reject non-Matrix.to URLs", () => {
            const arg = new UserArgument("user", true);

            expect(() => arg.parse("@charlie:matrix.org")).toThrow(
                "Invalid user argument - not a Matrix.to URL",
            );
        });

        test("should reject invalid user", async () => {
            const arg = new UserArgument("user", true);
            const event = createMockEvent();

            await expect(arg.validate("nonexistent", event)).rejects.toThrow(
                "is not a valid user",
            );
        });
    });
});
