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

        const eventualSubCommand = body.trim().split(" ")[1];

        if (eventualSubCommand && config.users.admin.includes(sender)) {
            const target = body.trim().split(" ")[2];

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

            switch (eventualSubCommand) {
                case "set": {
                    const balance = Number(body.trim().split(" ")[3]);

                    await setUserBalance(client, target, balance);

                    await client.sendMessage(
                        roomId,
                        `Set ${target} 's balance to ${formatBalance(balance)}`,
                        {
                            replyTo: event.eventId,
                        },
                    );
                }
            }

            return;
        }

        const balance = await getUserBalance(client, sender);

        await client.sendMessage(
            roomId,
            `Your balance is ${formatBalance(balance)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
