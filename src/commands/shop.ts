import type { CommandManifest } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { getOwnedItems, shopItems } from "../shop.ts";

export default {
    name: "shop",
    description: "View the shop",
    aliases: ["s"],
    args: [
        {
            name: "subcommand",
            description: "The subcommand to run",
            type: "string",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const [subcommand] = args;
        const { sender } = event;

        if (subcommand) {
            switch (subcommand) {
                case "list": {
                    await client.sendMessage(
                        roomId,
                        `## Shop items\n\n${shopItems.map((item, index) => `${index + 1}. **${item.name}** (${formatBalance(item.price)}): ${item.description}`).join("\n")}`,
                    );
                }
            }
        } else {
            const owned = await getOwnedItems(client, sender);

            if (owned.length === 0) {
                await client.sendMessage(roomId, "You don't have any items");
                return;
            }

            await client.sendMessage(
                roomId,
                `## Your items\n\n${owned.map((item) => `- ${item.name}`).join("\n")}`,
            );
        }
    },
} satisfies CommandManifest;
