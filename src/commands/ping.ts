import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "ping",
    description: "Ping the bot",
    aliases: ["p"],
    execute: async (_args, event): Promise<void> => {
        await event.reply({ type: "text", body: "Pong!" });
    },
});
