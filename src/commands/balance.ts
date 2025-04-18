import { User } from "../classes/user.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    execute: async (client, _args, { roomId, event }): Promise<void> => {
        const sender = new User(event.sender, client);
        const senderBalance = await sender.getBalance();

        await client.sendMessage(
            roomId,
            `Your balance is ${formatBalance(senderBalance)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
});
