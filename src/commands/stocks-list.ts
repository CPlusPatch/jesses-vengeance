import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "stocks:list",
    description: "List all owned stocks",
    aliases: ["sl"],
    category: "stocks",
    execute: async (_args, event): Promise<void> => {
        const ownedStocks = Object.entries(await event.sender.getOwnedStocks());

        if (ownedStocks.length === 0) {
            await event.reply({
                type: "text",
                body: "You don't have any stocks!",
            });
            return;
        }

        const stocksList = ownedStocks
            .map(([stock, amount]) => {
                return `- \`$${stock}\`: **${amount}** shares`;
            })
            .join("\n");

        await event.reply({
            type: "text",
            body: `## Your stocks\n\n${stocksList}`,
        });
    },
});
