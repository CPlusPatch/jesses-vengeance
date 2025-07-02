import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
    extractMxidFromHtml,
    parseHtmlCommand,
} from "../src/util/html-parser.ts";

describe("HTML Parser", () => {
    describe("parseHtmlCommand", () => {
        test("should parse simple command without HTML", () => {
            const result = parseHtmlCommand("!attack user", "!");

            expect(result).toEqual({
                commandName: "attack",
                args: ["user"],
                htmlArgs: [],
            });
        });

        test("should parse command with HTML mention", () => {
            const html =
                '!attack <a href="https://matrix.to/#/@user:matrix.org">@user:matrix.org</a>';
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("attack");
            expect(result?.args).toEqual([
                "https://matrix.to/#/@user:matrix.org",
            ]);
            expect(result?.htmlArgs).toHaveLength(1);
            expect(result?.htmlArgs[0]?.getAttribute("href")).toBe(
                "https://matrix.to/#/@user:matrix.org",
            );
        });

        test("should parse command with multiple mentions", () => {
            const html = `!give <a href="https://matrix.to/#/@alice:matrix.org">Alice</a> <a href="https://matrix.to/#/@bob:matrix.org">Bob</a>`;
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("give");
            expect(result?.args).toEqual([
                "https://matrix.to/#/@alice:matrix.org",
                "https://matrix.to/#/@bob:matrix.org",
            ]);
            expect(result?.htmlArgs).toHaveLength(2);
        });

        test("should parse command with mixed HTML mentions and text arguments", () => {
            const html =
                '!give <a href="https://matrix.to/#/@user:matrix.org">@user:matrix.org</a> 100';
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("give");
            expect(result?.args).toEqual([
                "https://matrix.to/#/@user:matrix.org",
                "100",
            ]);
            expect(result?.htmlArgs).toHaveLength(1);
        });

        test("should handle command with multiple text arguments", () => {
            const html = "!command arg1 arg2 arg3";
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("command");
            expect(result?.args).toEqual(["arg1", "arg2", "arg3"]);
            expect(result?.htmlArgs).toHaveLength(0);
        });

        test("should handle complex HTML with nested elements", () => {
            const html =
                '!attack <strong><a href="https://matrix.to/#/@user:matrix.org">User</a></strong> with force';
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("attack");
            expect(result?.args).toEqual([
                "https://matrix.to/#/@user:matrix.org",
                "with",
                "force",
            ]);
            expect(result?.htmlArgs).toHaveLength(1);
        });

        test("should return null for non-matching prefix", () => {
            const result = parseHtmlCommand("attack user", "!");
            expect(result).toBeNull();
        });

        test("should return null for empty command", () => {
            const result = parseHtmlCommand("! ", "!");
            expect(result).toBeNull();
        });

        test("should handle different prefixes", () => {
            const result = parseHtmlCommand("$balance", "$");

            expect(result?.commandName).toBe("balance");
            expect(result?.args).toEqual([]);
        });

        test("should ignore non-Matrix.to links", () => {
            const html = '!command <a href="https://example.com">link</a> text';
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("command");
            expect(result?.args).toEqual(["link", "text"]);
            expect(result?.htmlArgs).toHaveLength(0);
        });

        test("should handle whitespace correctly", () => {
            const html = "!command   arg1    arg2   ";
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("command");
            expect(result?.args).toEqual(["arg1", "arg2"]);
        });

        test("should handle HTML entities", () => {
            const html =
                '!test <a href="https://matrix.to/#/@user:matrix.org">&lt;@user&gt;</a>';
            const result = parseHtmlCommand(html, "!");

            expect(result?.commandName).toBe("test");
            expect(result?.args).toEqual([
                "https://matrix.to/#/@user:matrix.org",
            ]);
            expect(result?.htmlArgs).toHaveLength(1);
        });
    });

    describe("extractMxidFromHtml", () => {
        test("should extract MXID from Matrix.to link", () => {
            const window = new Window();
            const element = window.document.createElement("a");
            element.setAttribute(
                "href",
                "https://matrix.to/#/@user:matrix.org",
            );

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBe("@user:matrix.org");
        });

        test("should extract MXID with complex domain", () => {
            const window = new Window();
            const element = window.document.createElement("a");
            element.setAttribute(
                "href",
                "https://matrix.to/#/@test:example.com:8448",
            );

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBe("@test:example.com:8448");
        });

        test("should return null for non-Matrix.to links", () => {
            const window = new Window();
            const element = window.document.createElement("a");
            element.setAttribute("href", "https://example.com");

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBeNull();
        });

        test("should return null for invalid MXID format", () => {
            const window = new Window();
            const element = window.document.createElement("a");
            element.setAttribute("href", "https://matrix.to/#/invalid-mxid");

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBeNull();
        });

        test("should return null for element without href", () => {
            const window = new Window();
            const element = window.document.createElement("a");

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBeNull();
        });

        test("should handle room IDs (should return null as we only want user IDs)", () => {
            const window = new Window();
            const element = window.document.createElement("a");
            element.setAttribute(
                "href",
                "https://matrix.to/#/!room:matrix.org",
            );

            const mxid = extractMxidFromHtml(element as any);
            expect(mxid).toBeNull();
        });
    });
});
