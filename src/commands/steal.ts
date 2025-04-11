import type { CommandManifest } from "../commands.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";
import { ownsItem } from "../shop.ts";

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
    args: [
        {
            name: "target",
            description: "The user to steal from",
            required: true,
            type: "user",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const { sender } = event;

        const [target] = args as [string];
        const senderBalance = await getUserBalance(client, sender);

        if (senderBalance < 10) {
            await client.sendMessage(
                roomId,
                "You don't have enough balance to steal lol, broke bum ass, try again later",
                {
                    replyTo: event.eventId,
                },
            );
            return;
        }

        const hasVan = await ownsItem(client, sender, "getaway-van");

        const hasSucceeded =
            Math.random() < (hasVan ? 0.7 : STEAL_SUCCESS_RATE);
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
            const towCharge = punishment * 0.4;

            let newSenderBalance = senderBalance - punishment;
            const newTargetBalance = targetBalance + punishment;

            if (hasVan) {
                newSenderBalance -= towCharge;
            }

            await setUserBalance(client, sender, newSenderBalance);
            await setUserBalance(client, target, newTargetBalance);

            await client.sendMessage(
                roomId,
                `You failed to steal from ${target} ! As a punishment, you have to give ${formatBalance(
                    punishment,
                )} to ${target} !\n\n${target} balance: ${formatBalance(
                    newTargetBalance,
                )}\n\n${sender} balance: ${formatBalance(newSenderBalance)}${
                    hasVan
                        ? `\n\nVan towed! Tow charge: ${formatBalance(towCharge)}.`
                        : ""
                }`,
                {
                    replyTo: event.eventId,
                },
            );
        }
    },
} satisfies CommandManifest;
