import { CurrencyArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { randint } from "../util/math.ts";

export default defineCommand({
    name: "roulette",
    description: "Play Russian Roulette: a game of chance",
    aliases: ["roul"],
    args: {
        wager: new CurrencyArgument("wager", true, {
            description: "The amount of money to bet",
            min: 0,
        }),
    },
    execute: async ({ wager }, event): Promise<void> => {
        const senderBalance = await event.sender.getBalance();

        if (senderBalance < wager) {
            await event.reply({
                type: "text",
                body: "You don't have enough money to bet!",
            });
            return;
        }

        const result = randint(1, 6);

        const spinEvent = await event.reply({
            type: "text",
            body: "Spinning the wheel...",
        });

        await Bun.sleep(1000);

        if (result === 1) {
            await event.sender.addBalance(wager);

            await spinEvent.edit({
                type: "text",
                body: `The wheel landed on ${result}!\n\nYou **win**! Your wager has been DOUBLED!`,
            });
        } else if (result === 6) {
            await event.sender.addBalance(-wager);
            await event.sender.ban(
                60 * 10,
                "Has a hole through the cranium! 💀",
            );
            await spinEvent.edit({
                type: "text",
                body: `The wheel landed on ${result}!\n\nYou've been **SHOT**! You lost your wager, and you are banned from this bot for 10 minutes.`,
            });
        } else {
            await spinEvent.edit({
                type: "text",
                body: `The wheel landed on ${result}!\n\nThe wheel landed on a safe number! Your wager has been returned.`,
            });
        }
    },
});
