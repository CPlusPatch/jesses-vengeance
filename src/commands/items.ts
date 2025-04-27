import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "items",
    description: "List your owned items",
    execute: async (_args, { roomId, sender, id }): Promise<void> => {
        const owned = await sender.getOwnedItems();

        if (owned.length === 0) {
            await client.sendMessage(roomId, "You don't have any items!", {
                replyTo: id,
            });
            return;
        }

        await client.sendMessage(
            roomId,
            `## Your items\n\n${owned.map((item) => `- ${item.name}`).join("\n")}`,
            {
                replyTo: id,
            },
        );
    },
});
