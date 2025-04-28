import { defineCommand } from "../commands.ts";
import { formatBalanceRaw } from "../currency.ts";

export default defineCommand({
    name: "bank:balance",
    description: "Check your bank balance",
    aliases: ["bb"],
    category: "bank",
    execute: async (_args, event): Promise<void> => {
        const senderBalance = await event.sender.getBankBalance();

        await event.react(formatBalanceRaw(senderBalance));
    },
});
