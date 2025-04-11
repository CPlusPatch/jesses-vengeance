import type { CommandManifest } from "../commands.ts";
import { config } from "../config.ts";
import {
    deleteUserBalance,
    formatBalance,
    getUserBalance,
    setUserBalance,
} from "../currency.ts";

export default {
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    args: [
        {
            name: "command",
            description: "For admin use only.",
            type: "string",
        },
        {
            name: "target",
            description: "The user to perform balance operations on",
            type: "user",
        },
        {
            name: "amount",
            description: "The amount of money to set the balance to",
            type: "currency",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const { sender } = event;

        const [subCommand, target, operationBalance] = args as [
            string,
            string,
            string,
        ];
        const senderBalance = await getUserBalance(client, sender);

        if (subCommand) {
            if (!target) {
                await client.sendMessage(
                    roomId,
                    "Please provide a target user",
                    {
                        replyTo: event.eventId,
                    },
                );
                return;
            }

            if (!config.users.admin.includes(sender)) {
                return await client.sendMessage(
                    roomId,
                    "You are not authorized to use this command",
                    {
                        replyTo: event.eventId,
                    },
                );
            }

            switch (subCommand) {
                case "set": {
                    const balance = Number(operationBalance);

                    await setUserBalance(client, target, balance);

                    await client.sendMessage(
                        roomId,
                        `Set ${target} 's balance to ${formatBalance(balance)}`,
                        {
                            replyTo: event.eventId,
                        },
                    );

                    return;
                }
                case "rm": {
                    await deleteUserBalance(client, target);

                    await client.sendMessage(
                        roomId,
                        `Removed ${target} 's balance`,
                        {
                            replyTo: event.eventId,
                        },
                    );

                    return;
                }
            }

            return;
        }

        await client.sendMessage(
            roomId,
            `Your balance is ${formatBalance(senderBalance)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
