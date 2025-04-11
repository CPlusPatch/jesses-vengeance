import type { CommandManifest } from "../commands.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";
import { addOwnedItem, getOwnedItems, shopItems } from "../shop.ts";

export default {
    name: "buy",
    description: "Buy an item from the shop",
    aliases: ["b"],
    args: [
        {
            name: "itemNumber",
            type: "number",
            required: true,
            description: "The number of the item to buy",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const { sender } = event;

        const [itemNumber] = args;
        const shopItem = shopItems[Number(itemNumber) - 1];

        if (!shopItem) {
            await client.sendMessage(roomId, "Invalid item number", {
                replyTo: event.eventId,
            });
            return;
        }

        // Check if the user has already bought the item
        const owned = await getOwnedItems(client, sender);
        if (owned.some((item) => item.id === shopItem.id)) {
            await client.sendMessage(roomId, "You already have this item!", {
                replyTo: event.eventId,
            });
            return;
        }

        const balance = await getUserBalance(client, sender);

        if (balance < shopItem.price) {
            await client.sendMessage(
                roomId,
                "You don't have enough balance to buy this item",
                {
                    replyTo: event.eventId,
                },
            );
            return;
        }

        await setUserBalance(client, sender, balance - shopItem.price);
        await addOwnedItem(client, sender, shopItem);

        await client.sendMessage(
            roomId,
            `You have bought "${shopItem.name}" for ${formatBalance(
                shopItem.price,
            )}!\n\nYour new balance is ${formatBalance(balance - shopItem.price)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
