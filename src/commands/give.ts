import type { CommandManifest } from "../commands.ts";
import { getUserBalance, setUserBalance } from "../currency.ts";
import { formatBalance } from "../currency.ts";

export default {
    name: "give",
    description: "Give money to a user",
    execute: async (client, roomId, event): Promise<void> => {
        const {
            sender,
            content: { body },
        } = event;

        const [, target, amountStr] = body.trim().split(" ");

        if (!(target && amountStr)) {
            return await client.sendMessage(
                roomId,
                "Please provide a target and amount",
                {
                    replyTo: event.eventId,
                },
            );
        }

        const amount = Number(amountStr);
        const senderBalance = await getUserBalance(client, sender);
        const targetBalance = await getUserBalance(client, target);

        if (amount < 0) {
            return await client.sendMessage(
                roomId,
                "Nice try, you can't give negative balance",
                {
                    replyTo: event.eventId,
                },
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
