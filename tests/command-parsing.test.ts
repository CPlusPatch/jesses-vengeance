import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
    NumberArgument,
    StringArgument,
    UserArgument,
} from "../src/classes/arguments.ts";
import type { MessageEvent } from "../src/classes/event.ts";
import { User } from "../src/classes/user.ts";
import { parseArgs } from "../src/commands.ts";
import { mockClient } from "./mocks.ts";

// Mock the client import
mock.module("../../index.ts", () => ({
    client: mockClient,
}));

const createMockMessageEvent = (senderMxid = "@sender:matrix.org") =>
    ({
        sender: new User(senderMxid),
        roomId: "!room:matrix.org",
        id: "event_id",
        type: "message" as const,
        content: {},
        sentAt: new Date(),
        inReplyToId: null,
        body: "",
        formattedBody: null,
        isText: mock(() => true),
        reply: mock(),
        edit: mock(),
        react: mock(),
        getReplyTarget: mock(),
        onReply: mock(() => () => {
            // Mock implementation
        }),
        onReaction: mock(() => () => {
            // Mock implementation
        }),
    }) as MessageEvent;

describe("Command Argument Parsing Integration", () => {
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
        ]);
        mockClient.isUserInRoom.mockResolvedValue(true);
    });
    test("should parse command with user argument from HTML mention", async () => {
        const command = {
            name: "give",
            args: {
                target: new UserArgument("target", true),
                amount: new NumberArgument("amount", true),
            },
            execute: mock(),
        };

        const args = ["https://matrix.to/#/@alice:matrix.org", "100"];
        const event = createMockMessageEvent();

        const result = await parseArgs(args, command, event);

        expect(result.target.mxid).toBe("@alice:matrix.org");
        expect(result.amount).toBe(100);
    });

    test("should parse command with mixed argument types", async () => {
        const command = {
            name: "test",
            args: {
                user: new UserArgument("user", true),
                text: new StringArgument("text", true),
                number: new NumberArgument("number", true),
            },
            execute: mock(),
        };

        const args = [
            "https://matrix.to/#/@alice:matrix.org",
            "hello world",
            "42",
        ];
        const event = createMockMessageEvent();

        const result = await parseArgs(args, command, event);

        expect(result.user.mxid).toBe("@alice:matrix.org");
        expect(result.text).toBe("hello world");
        expect(result.number).toBe(42);
    });

    test("should handle optional arguments", async () => {
        const command = {
            name: "test",
            args: {
                required: new StringArgument("required", true),
                optional: new StringArgument("optional", false),
            },
            execute: mock(),
        };

        const args = ["hello"];
        const event = createMockMessageEvent();

        const result = await parseArgs(args, command, event);

        expect(result.required).toBe("hello");
        expect(result.optional).toBeUndefined();
    });

    test("should throw error for missing required arguments", async () => {
        const command = {
            name: "test",
            args: {
                required: new StringArgument("required", true),
            },
            execute: mock(),
        };

        const args: string[] = [];
        const event = createMockMessageEvent();

        await expect(parseArgs(args, command, event)).rejects.toThrow(
            "Missing required argument required",
        );
    });

    test("should handle validation errors", async () => {
        const command = {
            name: "test",
            args: {
                user: new UserArgument("user", true),
            },
            execute: mock(),
        };

        const args = ["invalid_user"];
        const event = createMockMessageEvent();

        await expect(parseArgs(args, command, event)).rejects.toThrow(
            "is not a valid user",
        );
    });

    test("should parse command with no arguments", async () => {
        const command = {
            name: "balance",
            args: {},
            execute: mock(),
        };

        const args: string[] = [];
        const event = createMockMessageEvent();

        const result = await parseArgs(args, command, event);

        expect(result).toEqual({});
    });
});
