import { ShopItemArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

export default defineCommand({
    name: "buy",
    description: "Buy an item from the shop",
    args: {
        item: new ShopItemArgument("item", true, {
            description: "The item to buy",
        }),
    },
    execute: async ({ item }, event): Promise<void> => {
        // Check if the user has already bought the item
        if (await event.sender.ownsItem(item)) {
            await event.reply({
                type: "text",
                body: "You already have this item!",
            });
            return;
        }

        const balance = await event.sender.getBalance();

        if (balance < item.price) {
            await event.reply({
                type: "text",
                body: "You don't have enough balance to buy this item",
            });
            return;
        }

        const newBalance = await event.sender.addBalance(-item.price);
        await event.sender.addOwnedItem(item);

        await event.reply({
            type: "text",
            body: `You have bought "${item.name}" for ${formatBalance(
                item.price,
            )}!\n\nYour new balance is ${formatBalance(newBalance)}`,
        });
    },
});
