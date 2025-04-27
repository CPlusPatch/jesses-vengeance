import { client } from "../../index.ts";
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
    disabled: true,
    execute: async ({ stock }, { roomId, id }): Promise<void> => {
        const stockSvg = stockToSVG(stock, 24 * 60 * 60);
        const buffer = Buffer.from(stockSvg);

        await client.sendMessage(
            roomId,
            `Visualization of stock \`${stock.name}\`:`,
            {
                replyTo: id,
            },
        );

        const mxc = await client.client.uploadContent(
            buffer,
            "image/svg+xml",
            `${stock.name}-chart.svg`,
        );

        await client.sendMedia(roomId, mxc, {
            metadata: {
                width: 900,
                height: 500,
                contentType: "image/svg+xml",
                size: buffer.byteLength,
            },
        });
    },
});
