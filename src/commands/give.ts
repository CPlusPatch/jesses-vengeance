import type { CommandManifest } from "../commands.ts";
import { getUserBalance, setUserBalance } from "../currency.ts";
import { formatBalance } from "../currency.ts";

export default {
    name: "give",
    description: "Give money to a user",
    args: [
        {
            name: "target",
            description: "The user to give money to",
            required: true,
            type: "user",
        },
        {
            name: "amount",
            description: "The amount of money to give",
            required: true,
            type: "currency-nonnegative",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const { sender } = event;

        const [target, amountStr] = args as [string, string];

        const amount = Number(amountStr);
        const senderBalance = await getUserBalance(client, sender);
        const targetBalance = await getUserBalance(client, target);

        if (sender === target) {
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

        await setUserBalance(client, sender, senderBalance - amount);
        await setUserBalance(client, target, targetBalance + amount);

        await client.sendMessage(
            roomId,
            `Gave ${formatBalance(amount)} to ${target} !`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
