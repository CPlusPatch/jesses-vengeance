import { ShopItemArgument } from "../classes/arguments.ts";
import { User } from "../classes/user.ts";
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
    execute: async (client, { item }, { roomId, event }): Promise<void> => {
        const sender = new User(event.sender, client);

        // Check if the user has already bought the item
        if (await sender.ownsItem(item)) {
            await client.sendMessage(roomId, "You already have this item!", {
                replyTo: event.eventId,
            });
            return;
        }

        const balance = await sender.getBalance();

        if (balance < item.price) {
            await client.sendMessage(
                roomId,
                "You don't have enough balance to buy this item",
                {
                    replyTo: event.eventId,
                },
            );
            return;
        }

        const newBalance = await sender.addBalance(-item.price);
        await sender.addOwnedItem(item);

        await client.sendMessage(
            roomId,
            `You have bought "${item.name}" for ${formatBalance(
                item.price,
            )}!\n\nYour new balance is ${formatBalance(newBalance)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
});
