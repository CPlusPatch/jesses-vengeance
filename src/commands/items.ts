import { User } from "../classes/user.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "items",
    description: "List your owned items",
    execute: async (client, _args, { roomId, event }): Promise<void> => {
        const sender = new User(event.sender, client);

        const owned = await sender.getOwnedItems();

        if (owned.length === 0) {
            await client.sendMessage(roomId, "You don't have any items!", {
                replyTo: event.eventId,
            });
            return;
        }

        await client.sendMessage(
            roomId,
            `## Your items\n\n${owned.map((item) => `- ${item.name}`).join("\n")}`,
            {
                replyTo: event.eventId,
            },
        );
    },
});
