import { CurrencyArgument } from "../classes/arguments.ts";
import { User } from "../classes/user.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { randint } from "../util/math.ts";

export default defineCommand({
    name: "roulette",
    description: "Play Russian Roulette: a game of chance",
    aliases: ["roul"],
    args: {
        wager: new CurrencyArgument("wager", true, {
            description: "The amount of money to bet",
        }),
    },
    execute: async (client, { wager }, { roomId, event }): Promise<void> => {
        const sender = new User(event.sender, client);
        const senderBalance = await sender.getBalance();

        if (senderBalance < wager) {
            await client.sendMessage(
                roomId,
                "You don't have enough money to bet!",
            );
            return;
        }

        const result = randint(1, 6);

        const id = await client.sendMessage(roomId, "Spinning the wheel...", {
            replyTo: event.eventId,
        });

        await Bun.sleep(1000);

        await client.sendMessage(roomId, `The wheel landed on ${result}!`, {
            replyTo: event.eventId,
            edit: id,
        });

        if (result === 1) {
            const newBalance = await sender.addBalance(wager);

            await client.sendMessage(
                roomId,
                `You **win**! Your wager has been DOUBLED!\n\nNew balance: ${formatBalance(newBalance)}`,
            );
        } else if (result === 6) {
            const newBalance = await sender.addBalance(-wager);
            await sender.ban(60 * 10, "Has a hole through the cranium! 💀");
            await client.sendMessage(
                roomId,
                `You've been **SHOT**! You lost your wager, and you are banned from this bot for 10 minutes.\n\nNew balance: ${formatBalance(newBalance)}`,
            );
        } else {
            await client.sendMessage(
                roomId,
                "The wheel landed on a safe number! Your wager has been returned.",
            );
        }
    },
});
