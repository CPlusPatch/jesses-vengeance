import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { shopItems } from "../shop.ts";

export default defineCommand({
    name: "shop",
    description: "View the shop",
    category: "shop",
    execute: async (_args, event): Promise<void> => {
        await event.reply({
            type: "text",
            body: `## Shop items\n\n${shopItems.map((item, index) => `${index + 1}. **${item.name}** (${formatBalance(item.price)}): ${item.description}`).join("\n")}`,
        });
    },
});
