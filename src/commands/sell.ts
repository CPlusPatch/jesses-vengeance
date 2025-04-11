import type { CommandManifest } from "../commands.ts";
import { formatBalance, getUserBalance, setUserBalance } from "../currency.ts";
import { ownsItem, removeOwnedItem, shopItems } from "../shop.ts";

const RESALE_PERCENTAGE = 0.7;

export default {
    name: "sell",
    description: "Sell an item to the shop",
    args: [
        {
            name: "itemNumber",
            type: "number",
            required: true,
            description: "The number of the item to sell",
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
        if (!(await ownsItem(client, sender, shopItem.id))) {
            await client.sendMessage(roomId, "You don't have this item!", {
                replyTo: event.eventId,
            });
            return;
        }

        const balance = await getUserBalance(client, sender);

        const newBalance = balance + shopItem.price * RESALE_PERCENTAGE;

        await setUserBalance(client, sender, newBalance);
        await removeOwnedItem(client, sender, shopItem.id);

        await client.sendMessage(
            roomId,
            `You have sold "${shopItem.name}" for ${formatBalance(
                shopItem.price * RESALE_PERCENTAGE,
            )}!\n\nYour new balance is ${formatBalance(newBalance)}`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
