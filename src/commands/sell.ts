import { ShopItemArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

const RESALE_PERCENTAGE = 0.7;

export default defineCommand({
    name: "sell",
    description: "Sell an item to the shop",
    args: {
        item: new ShopItemArgument("item", true, {
            description: "The item to sell",
        }),
    },
    execute: async ({ item }, event): Promise<void> => {
        // Check if the user has already bought the item
        if (!(await event.sender.ownsItem(item))) {
            await event.reply({
                type: "text",
                body: "You don't have this item!",
            });
            return;
        }

        const price = item.price * RESALE_PERCENTAGE;

        const newBalance = await event.sender.addBalance(price);
        await event.sender.removeOwnedItem(item);

        await event.reply({
            type: "text",
            body: `You have sold "${item.name}" for ${formatBalance(price)}! (${
                RESALE_PERCENTAGE * 100
            }% of the original price)\n\nYour new balance is ${formatBalance(
                newBalance,
            )}`,
        });
    },
});
