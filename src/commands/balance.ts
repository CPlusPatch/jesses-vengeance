import type { CommandManifest } from "../commands.ts";
import { config } from "../config.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";

export default {
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    execute: async (client, roomId, event): Promise<void> => {
        const {
            sender,
            content: { body },
        } = event;

        const [, subCommand, target, operationBalance] = body.trim().split(" ");
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

            switch (subCommand) {
                case "set": {
                    if (!config.users.admin.includes(sender)) {
                        return await client.sendMessage(
                            roomId,
                            "You are not authorized to use this command",
                            {
                                replyTo: event.eventId,
                            },
                        );
                    }

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
