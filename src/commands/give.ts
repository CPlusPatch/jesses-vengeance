import { CurrencyArgument } from "../classes/arguments.ts";
import { UserArgument } from "../classes/arguments.ts";
import { User } from "../classes/user.ts";
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
    execute: async (
        client,
        { target, amount },
        { roomId, event },
    ): Promise<void> => {
        const sender = new User(event.sender, client);

        const senderBalance = await sender.getBalance();

        if (sender.mxid === target.mxid) {
            return await client.sendMessage(
                roomId,
                "You can't give money to yourself",
            );
        }

        if (senderBalance < amount) {
            return await client.sendMessage(
                roomId,
                `You don't have enough balance to give ${formatBalance(amount)}`,
            );
        }

        await sender.addBalance(-amount);
        await target.addBalance(amount);

        await client.sendMessage(
            roomId,
            `Gave ${formatBalance(amount)} to ${target.mxid}!`,
            {
                replyTo: event.eventId,
            },
        );
    },
});
