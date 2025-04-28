import { CurrencyArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "bank:deposit",
    description: "Deposit money into your bank for safekeeping",
    aliases: ["bd"],
    args: {
        amount: new CurrencyArgument("amount", true, {
            description: "How much money to deposit",
            min: 1,
        }),
    },
    execute: async ({ amount }, event): Promise<void> => {
        const senderBalance = await event.sender.getBalance();

        if (amount > senderBalance) {
            await event.reply({
                type: "text",
                body: `You don't have enough cash to deposit ${formatBalance(amount)}.`,
            });
            return;
        }

        const newSenderBalance = await event.sender.addBalance(-amount);
        const newBankBalance = await event.sender.addBankBalance(amount);

        await event.reply({
            type: "text",
            body: `You deposited ${formatBalance(amount)} into your bank.\n\nYour new balance is ${formatBalance(
                newSenderBalance,
            )}.\n\nYour bank balance is ${formatBalance(newBankBalance)}.`,
        });
    },
});
