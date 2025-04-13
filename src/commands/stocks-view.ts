import { StockArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { stockToSVG } from "../util/finance.ts";

export default defineCommand({
    name: "stocks:view",
    description: "View a stock",
    aliases: ["sv"],
    args: {
        stock: new StockArgument("stock", true, {
            description: "The stock to view",
        }),
    },
    execute: async (client, { stock }, { roomId, event }): Promise<void> => {
        const stockSvg = stockToSVG(stock[1]);

        await client.sendMessage(
            roomId,
            `Visualization of stock \`${stock[0]}\`:`,
            {
                replyTo: event.eventId,
            },
        );

        const mxc = await client.client.uploadContent(
            Buffer.from(stockSvg),
            "image/svg+xml",
            `${stock[0]}-chart.svg`,
        );

        await client.sendMedia(roomId, mxc);
    },
});
