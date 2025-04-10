import type { CommandManifest } from "../commands.ts";

export default {
    name: "ping",
    description: "Ping the bot",
    aliases: ["p"],
    execute: async (client, roomId, event): Promise<void> => {
        await client.sendMessage(roomId, "Pong!", {
            replyTo: event.eventId,
        });
    },
} satisfies CommandManifest;
