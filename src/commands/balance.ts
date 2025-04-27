import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "balance",
    description: "Check your balance",
    aliases: ["bal"],
    execute: async (_args, { sender, roomId, id }): Promise<void> => {
        const senderBalance = await sender.getBalance();

        await client.sendMessage(
            roomId,
            `Your balance is ${formatBalance(senderBalance)}`,
            {
                replyTo: id,
            },
        );
    },
});
