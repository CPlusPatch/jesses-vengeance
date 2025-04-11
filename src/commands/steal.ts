import type { CommandManifest } from "../commands.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";

const STEAL_SUCCESS_RATE = 0.5;
const STEAL_AMOUNT_MIN_PERCENT = 0.01;
const STEAL_AMOUNT_MAX_PERCENT = 0.5;
const getStealAmount = (): number => {
    return (
        Math.random() * (STEAL_AMOUNT_MAX_PERCENT - STEAL_AMOUNT_MIN_PERCENT) +
        STEAL_AMOUNT_MIN_PERCENT
    );
};

export default {
    name: "steal",
    description: "Steal from a user",
    execute: async (client, roomId, event): Promise<void> => {
        const {
            sender,
            content: { body },
        } = event;

        const [, target] = body.trim().split(" ");
        const senderBalance = await getUserBalance(client, sender);

        if (!target) {
            return await client.sendMessage(
                roomId,
                "Please provide a target user",
                {
                    replyTo: event.eventId,
                },
            );
        }

        const hasSucceeded = Math.random() < STEAL_SUCCESS_RATE;
        const targetBalance = await getUserBalance(client, target);

        if (hasSucceeded) {
            const stolenAmount = getStealAmount() * targetBalance;

            const newSenderBalance = senderBalance + stolenAmount;
            const newTargetBalance = targetBalance - stolenAmount;

            await setUserBalance(client, sender, newSenderBalance);
            await setUserBalance(client, target, newTargetBalance);

            await client.sendMessage(
                roomId,
                `You successfully stole ${formatBalance(
                    stolenAmount,
                )} from ${target} ! They're mad!\n\n${target} balance: ${formatBalance(
                    newTargetBalance,
                )}\n\n${sender} balance: ${formatBalance(newSenderBalance)}`,
                {
                    replyTo: event.eventId,
                },
            );
        } else {
            const punishment = getStealAmount() * senderBalance;

            const newSenderBalance = senderBalance - punishment;
            const newTargetBalance = targetBalance + punishment;

            await setUserBalance(client, sender, newSenderBalance);
            await setUserBalance(client, target, newTargetBalance);

            await client.sendMessage(
                roomId,
                `You failed to steal from ${target} ! As a punishment, you have to give ${formatBalance(
                    punishment,
                )} to ${target} !\n\n${target} balance: ${formatBalance(
                    newTargetBalance,
                )}\n\n${sender} balance: ${formatBalance(newSenderBalance)}`,
                {
                    replyTo: event.eventId,
                },
            );
        }
    },
} satisfies CommandManifest;
