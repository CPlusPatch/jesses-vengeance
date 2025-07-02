import { Window } from "happy-dom";

export interface ParsedCommand {
    commandName: string;
    args: string[];
    htmlArgs: HTMLElement[];
}

/**
 * Parse HTML formatted body to extract command and arguments
 * Handles Matrix mentions as HTML links and other formatted content
 */
export function parseHtmlCommand(
    formattedBody: string,
    prefix: string,
): ParsedCommand | null {
    const window = new Window();
    const document = window.document;

    // Parse the HTML
    document.body.innerHTML = formattedBody;

    // Get the text content to extract command name
    const textContent = document.body.textContent || "";

    if (!textContent.startsWith(prefix)) {
        return null;
    }

    const commandName = textContent
        .split(" ")[0]
        ?.slice(prefix.length)
        .toLowerCase();

    if (!commandName) {
        return null;
    }

    // Extract arguments by analyzing the HTML structure
    const args: string[] = [];
    const htmlArgs: HTMLElement[] = [];

    // Get all Matrix mention links first
    const mentionLinks = document.querySelectorAll(
        'a[href^="https://matrix.to/#/"]',
    );
    for (const link of mentionLinks) {
        const href = link.getAttribute("href");
        if (href) {
            args.push(href);
            htmlArgs.push(link as unknown as HTMLElement);
        }
    }

    // Extract non-mention text arguments
    // Clone the content and remove Matrix mention links to get clean text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = formattedBody;

    // Remove Matrix mention links from the clone
    const linksToRemove = tempDiv.querySelectorAll(
        'a[href^="https://matrix.to/#/"]',
    );
    for (const link of linksToRemove) {
        link.remove();
    }

    // Get the remaining text content and extract arguments
    const cleanText = tempDiv.textContent || "";
    if (cleanText.startsWith(prefix + commandName)) {
        const afterCommand = cleanText
            .slice((prefix + commandName).length)
            .trim();
        if (afterCommand) {
            const textArgs = afterCommand
                .split(/\s+/)
                .filter((arg) => arg.length > 0);
            args.push(...textArgs);
        }
    }

    return {
        commandName,
        args,
        htmlArgs,
    };
}

/**
 * Extract MXID from Matrix HTML link
 */
export function extractMxidFromHtml(element: HTMLElement): string | null {
    const href = element.getAttribute("href");
    if (!href?.startsWith("https://matrix.to/#/")) {
        return null;
    }

    // Extract MXID from matrix.to URL
    const mxid = href.replace("https://matrix.to/#/", "");
    if (mxid.match(/^@[^:]*:.+$/)) {
        return mxid;
    }

    return null;
}
