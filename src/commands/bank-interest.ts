import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

const MIN_INTEREST_RATE = 0.01;
const MAX_INTEREST_RATE = 0.03;

export default defineCommand({
    name: "bank:interest",
    description: "Collect interest from your bank",
    aliases: ["bi"],
    category: "bank",
    cooldownSeconds: 12 * 60 * 60, // 12 hours
    execute: async (_args, event): Promise<void> => {
        const senderBalance = await event.sender.getBankBalance();

        const interest =
            Math.random() * (MAX_INTEREST_RATE - MIN_INTEREST_RATE) +
            MIN_INTEREST_RATE;

        const interestAmount = senderBalance * interest;

        await event.sender.addBankBalance(interestAmount);

        await event.reply({
            type: "text",
            body: `Current interest rate: \`${(interest * 100).toFixed(2)}%\`\n\nYou have collected ${formatBalance(interestAmount)} interest from your bank!`,
        });
    },
});
