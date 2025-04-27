import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance, getTopUsers } from "../currency.ts";

export default defineCommand({
    name: "leaderboard",
    description: "Show the top 10 users by balance",
    aliases: ["lb"],
    execute: async (_args, { roomId, id }): Promise<void> => {
        const leaderboard = await getTopUsers(client);

        await client.sendMessage(
            roomId,
            `## Top 10 Users by Balance\n${leaderboard.map((user, index) => `${index + 1}. ${user.userId} : ${formatBalance(user.balance)}`).join("\n")}`,
            {
                replyTo: id,
            },
        );
    },
});
