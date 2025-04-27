import { client } from "../../index.ts";
import { UserArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { type ShopItem, shopItems } from "../shop.ts";

const STEAL_SUCCESS_RATE = 0.5;
const STEAL_AMOUNT_MIN_PERCENT = 0.01;
const STEAL_AMOUNT_MAX_PERCENT = 0.5;
const getStealAmount = (): number => {
    return (
        Math.random() * (STEAL_AMOUNT_MAX_PERCENT - STEAL_AMOUNT_MIN_PERCENT) +
        STEAL_AMOUNT_MIN_PERCENT
    );
};

export default defineCommand({
    name: "steal",
    description: "Steal from a user",
    args: {
        target: new UserArgument("target", true, {
            description: "The user to steal from",
        }),
    },
    execute: async ({ target }, { roomId, sender, id }): Promise<void> => {
        const senderBalance = await sender.getBalance();

        if (senderBalance < 10) {
            await client.sendMessage(
                roomId,
                "You don't have enough balance to steal lol, broke ass, try again later",
                {
                    replyTo: id,
                },
            );
            return;
        }

        const hasVan = await sender.ownsItem(
            shopItems.find((item) => item.id === "getaway-van") as ShopItem,
        );

        const hasSucceeded =
            Math.random() < (hasVan ? 0.7 : STEAL_SUCCESS_RATE);
        const targetBalance = await target.getBalance();

        if (hasSucceeded) {
            const stolenAmount = getStealAmount() * targetBalance;

            const newSenderBalance = await sender.addBalance(stolenAmount);
            const newTargetBalance = await target.addBalance(-stolenAmount);

            await client.sendMessage(
                roomId,
                `You successfully stole ${formatBalance(
                    stolenAmount,
                )} from ${target.mxid} ! They're mad!\n\n${target.mxid} balance: ${formatBalance(
                    newTargetBalance,
                )}\n\n${sender.mxid} balance: ${formatBalance(newSenderBalance)}`,
                {
                    replyTo: id,
                },
            );
        } else {
            const punishment = getStealAmount() * senderBalance;
            const towCharge = punishment * 0.4;

            let newSenderBalance = await sender.addBalance(-punishment);
            const newTargetBalance = await target.addBalance(punishment);

            if (hasVan) {
                newSenderBalance = await sender.addBalance(-towCharge);
            }

            await client.sendMessage(
                roomId,
                `You failed to steal from ${target.mxid} ! As a punishment, you have to give ${formatBalance(
                    punishment,
                )} to ${target.mxid} !\n\n${target.mxid} balance: ${formatBalance(
                    newTargetBalance,
                )}\n\n${sender.mxid} balance: ${formatBalance(newSenderBalance)}${
                    hasVan
                        ? `\n\nVan towed! Tow charge: ${formatBalance(towCharge)}.`
                        : ""
                }`,
                {
                    replyTo: id,
                },
            );
        }
    },
});
