import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    execute: async (_args, event): Promise<void> => {
        const senderBalance = await event.sender.getBalance();

        await event.reply({
            type: "text",
            body: `Your balance is ${formatBalance(senderBalance)}`,
        });
    },
});
