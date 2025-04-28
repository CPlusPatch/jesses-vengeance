import { NumberArgument, StockArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { simulateStockPrice } from "../util/finance.ts";

export default defineCommand({
    name: "stocks:sell",
    description: "Sell stock shares",
    aliases: ["ss"],
    category: "stocks",
    args: {
        stock: new StockArgument("stock", true, {
            description: "The stock to sell",
        }),
        amount: new NumberArgument("amount", false, {
            description: "The amount of shares to sell",
            min: 1,
            int: true,
        }),
    },
    execute: async ({ stock, amount = 1 }, event): Promise<void> => {
        const t = Math.floor(Date.now() / 1000);
        const stockPrice = await simulateStockPrice(t, stock.parameters);
        const ownedShares = await event.sender.getStock(stock.name);

        if (amount > ownedShares) {
            await event.reply({
                type: "text",
                body: `You don't own enough shares of \`$${stock.name}\` to sell **${amount}** shares.`,
            });
            return;
        }

        await event.sender.addBalance(stockPrice * amount);
        await event.sender.addStock(stock.name, -amount);

        await event.reply({
            type: "text",
            body: `Sold **${amount}** shares of ${stock.name} at ${formatBalance(stockPrice)} (${formatBalance(
                stockPrice * amount,
            )} total).`,
        });
    },
});
