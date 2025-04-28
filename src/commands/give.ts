import { CurrencyArgument } from "../classes/arguments.ts";
import { UserArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "give",
    description: "Give money to a user",
    args: {
        target: new UserArgument("target", true, {
            description: "The user to give money to",
        }),
        amount: new CurrencyArgument("amount", true, {
            description: "The amount of money to give",
            min: 0,
        }),
    },
    category: "cash",
    execute: async ({ target, amount }, event): Promise<void> => {
        const senderBalance = await event.sender.getBalance();

        if (event.sender.mxid === target.mxid) {
            await event.reply({
                type: "text",
                body: "You can't give money to yourself",
            });
            return;
        }

        if (senderBalance < amount) {
            await event.reply({
                type: "text",
                body: `You don't have enough balance to give ${formatBalance(amount)}`,
            });
            return;
        }

        await event.sender.addBalance(-amount);
        await target.addBalance(amount);

        await event.reply({
            type: "text",
            body: `Gave ${formatBalance(amount)} to ${target.mxid}!`,
            mentions: [target],
        });
    },
});
