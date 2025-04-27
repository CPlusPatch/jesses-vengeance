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
    execute: async ({ stock }, event): Promise<void> => {
        const stockSvg = stockToSVG(stock, 24 * 60 * 60);
        const buffer = Buffer.from(stockSvg);

        await event.reply({
            type: "text",
            body: `Visualization of stock \`${stock.name}\`:`,
        });

        const mxc = await client.client.uploadContent(
            buffer,
            "image/svg+xml",
            `${stock.name}-chart.svg`,
        );

        await event.reply({
            type: "media",
            meta: {
                w: 900,
                h: 500,
                mimetype: "image/svg+xml",
                size: buffer.byteLength,
            },
            url: mxc,
        });
    },
});
