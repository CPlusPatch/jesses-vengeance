import { defineCommand } from "../commands.ts";
import { formatBalanceRaw } from "../currency.ts";

export default defineCommand({
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    category: "cash",
    execute: async (_args, event): Promise<void> => {
        const senderBalance = await event.sender.getBalance();

        await event.react(formatBalanceRaw(senderBalance));
    },
});
