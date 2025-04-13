import consola from "consola";
import { CurrencyArgument } from "../classes/arguments.ts";
import { User } from "../classes/user.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

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

export default defineCommand({
    name: "rockpaperscissors",
    description: "Play a game of rock paper scissors",
    aliases: ["rps"],
    args: {
        wager: new CurrencyArgument("wager", false, {
            description: "The amount of money to bet on the game",
            min: 0,
        }),
    },
    execute: async (client, { wager }, { roomId, event }): Promise<void> => {
        const sender = new User(event.sender, client);

        const balance = await sender.getBalance();

        if (wager) {
            consola.debug(
                `${sender.mxid} is betting ${wager} on rockpaperscissors`,
            );
        }

        if (wager && wager > balance) {
            await client.sendMessage(
                roomId,
                "You don't have enough balance to bet that much",
                {
                    replyTo: event.eventId,
                },
            );
            return;
        }

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
            if (event.sender !== sender.mxid) {
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

                if (wager) {
                    const newBalance = await sender.addBalance(wager * 2);
                    await client.sendMessage(
                        roomId,
                        `You won ${formatBalance(
                            wager,
                        )}!\n\nNew balance: ${formatBalance(newBalance)}`,
                    );
                } else {
                    await client.sendMessage(roomId, "You **win**! Whoohoo!");
                }
            } else {
                await client.sendMessage(
                    roomId,
                    `${message}\n\n\`${userChoice}\` does NOT beat \`${choice}\`!`,
                );

                if (wager) {
                    const newBalance = await sender.addBalance(-wager);

                    await client.sendMessage(
                        roomId,
                        `You lost ${formatBalance(
                            wager,
                        )}!\n\nNew balance: ${formatBalance(newBalance)}`,
                    );
                } else {
                    await client.sendMessage(roomId, "you **LOSE** dumbass");
                }
            }

            client.client.off("room.message", callback);
        };

        client.client.on("room.message", callback);
    },
});
