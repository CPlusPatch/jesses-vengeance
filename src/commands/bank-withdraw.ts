import { CurrencyArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "bank:withdraw",
    description: "Withdraw money from your bank to pay for things",
    aliases: ["bw"],
    args: {
        amount: new CurrencyArgument("amount", true, {
            description: "How much money to withdraw",
            min: 1,
        }),
    },
    execute: async ({ amount }, event): Promise<void> => {
        const senderBankBalance = await event.sender.getBankBalance();

        if (amount > senderBankBalance) {
            await event.reply({
                type: "text",
                body: `You don't have enough money in the bank to withdraw ${formatBalance(amount)}.`,
            });
            return;
        }

        const newSenderBalance = await event.sender.addBalance(amount);
        const newBankBalance = await event.sender.addBankBalance(-amount);

        await event.reply({
            type: "text",
            body: `You withdrew ${formatBalance(amount)} from your bank.\n\nYour new balance is ${formatBalance(
                newSenderBalance,
            )}.\n\nYour bank balance is ${formatBalance(newBankBalance)}.`,
        });
    },
});
