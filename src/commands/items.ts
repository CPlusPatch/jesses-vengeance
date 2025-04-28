import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "items",
    description: "List your owned items",
    category: "shop",
    execute: async (_args, event): Promise<void> => {
        const owned = await event.sender.getOwnedItems();

        if (owned.length === 0) {
            await event.reply({
                type: "text",
                body: "You don't have any items!",
            });
            return;
        }

        await event.reply({
            type: "text",
            body: `## Your items\n\n${owned.map((item) => `- ${item.name}`).join("\n")}`,
        });
    },
});
