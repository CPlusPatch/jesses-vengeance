import type { MessageEvent, TextualMessageEventContent } from "matrix-bot-sdk";
import type { Bot } from ".";

export interface CommandManifest {
    name: string;
    description?: string;
    aliases?: string[];
    execute: (
        client: Bot,
        roomId: string,
        event: MessageEvent<TextualMessageEventContent>,
    ) => void | Promise<void>;
}
