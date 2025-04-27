import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { shopItems } from "../shop.ts";

export default defineCommand({
    name: "shop",
    description: "View the shop",
    execute: async (_args, { roomId, id }): Promise<void> => {
        await client.sendMessage(
            roomId,
            `## Shop items\n\n${shopItems.map((item, index) => `${index + 1}. **${item.name}** (${formatBalance(item.price)}): ${item.description}`).join("\n")}`,
            {
                replyTo: id,
            },
        );
    },
});
