import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "ping",
    description: "Ping the bot",
    aliases: ["p"],
    execute: async (client, _args, { roomId, event }): Promise<void> => {
        await client.sendMessage(roomId, "Pong!", {
            replyTo: event.eventId,
        });
    },
});
