import type { CommandManifest } from "../commands.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";

const choices = [
    "rock",
    "paper",
    "scissors",
    "milton keynes",
    "among us",
    "nexy",
    "jesse",
    "matt damon",
] as const;
const rules = {
    rock: ["scissors", "nexy", "jesse"],
    paper: ["rock", "matt damon", "milton keynes"],
    scissors: ["paper", "among us"],
    "milton keynes": ["paper", "rock"],
    "among us": ["jesse", "matt damon", "milton keynes"],
    nexy: ["rock", "jesse", "milton keynes"],
    jesse: ["rock", "nexy"],
    "matt damon": ["rock", "nexy"],
};

export default {
    name: "rockpaperscissors",
    description: "Play a game of rock paper scissors",
    aliases: ["rps"],
    execute: async (client, roomId, event): Promise<void> => {
        const {
            sender,
            content: { body },
        } = event;

        const userWager = Number(body.split(" ")[1]);
        const balance = await getUserBalance(client, sender);

        const choice = choices[
            Math.floor(Math.random() * choices.length)
        ] as (typeof choices)[number];

        await client.sendMessage(
            roomId,
            `What is your choice? You can use: \n${choices
                .map((c) => `- \`${c}\``)
                .join("\n")}`,
            {
                replyTo: event.eventId,
            },
        );

        const callback = async (
            roomId: string,
            event: {
                sender: string;
                content: { body: string };
                event_id: string;
            },
        ): Promise<void> => {
            if (event.sender !== sender) {
                return;
            }

            const userChoice = (event.content.body as string)
                ?.toLowerCase()
                .match(new RegExp(choices.join("|"), "i"))?.[0] as
                | (typeof choices)[number]
                | undefined;

            if (!userChoice) {
                await client.sendMessage(roomId, "yeah idk what you said", {
                    replyTo: event.event_id,
                });
                return;
            }

            const message = `You chose \`${userChoice}\`, I chose \`${choice}\`!`;

            if (userChoice === choice) {
                await client.sendMessage(roomId, `${message}\n\nIt's a tie!`);
            } else if (rules[userChoice].includes(choice)) {
                await client.sendMessage(
                    roomId,
                    `${message}\n\n\`${userChoice}\` beats \`${choice}\`!`,
                );

                if (userWager > 0) {
                    await client.sendMessage(
                        roomId,
                        `You won ${formatBalance(
                            userWager * 2,
                        )}!\n\nNew balance: ${formatBalance(
                            balance + userWager,
                        )}`,
                    );
                    await setUserBalance(client, sender, balance + userWager);
                } else {
                    await client.sendMessage(roomId, "You **win**! Whoohoo!");
                }
            } else {
                await client.sendMessage(
                    roomId,
                    `${message}\n\n\`${userChoice}\` does NOT beat \`${choice}\`!`,
                );

                if (userWager > 0) {
                    await client.sendMessage(
                        roomId,
                        `You lost ${formatBalance(
                            userWager,
                        )}!\n\nNew balance: ${formatBalance(
                            balance - userWager,
                        )}`,
                    );
                    await setUserBalance(client, sender, balance - userWager);
                } else {
                    await client.sendMessage(roomId, "you **LOSE** dumbass");
                }
            }

            client.client.off("room.message", callback);
        };

        client.client.on("room.message", callback);
    },
} satisfies CommandManifest;
