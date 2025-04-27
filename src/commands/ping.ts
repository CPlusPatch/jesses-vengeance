import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "ping",
    description: "Ping the bot",
    aliases: ["p"],
    execute: async (_args, { roomId, id }): Promise<void> => {
        await client.sendMessage(roomId, "Pong!", {
            replyTo: id,
        });
    },
});
