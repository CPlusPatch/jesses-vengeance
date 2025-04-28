import { NumberArgument, StockArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { simulateStockPrice } from "../util/finance.ts";

export default defineCommand({
    name: "stocks:buy",
    description: "Buy stock shares",
    aliases: ["sb"],
    category: "stocks",
    args: {
        stock: new StockArgument("stock", true, {
            description: "The stock to buy",
        }),
        amount: new NumberArgument("amount", false, {
            description: "The amount of shares to buy",
            min: 1,
            int: true,
        }),
    },
    execute: async ({ stock, amount = 1 }, event): Promise<void> => {
        const t = Math.floor(Date.now() / 1000);
        const stockPrice = await simulateStockPrice(t, stock.parameters);
        const senderBalance = await event.sender.getBalance();

        if (stockPrice * amount > senderBalance) {
            await event.reply({
                type: "text",
                body: `You don't have enough cash to buy **${amount}** shares of \`$${stock.name}\` at ${formatBalance(stockPrice)} (${formatBalance(
                    stockPrice * amount,
                )} total).`,
            });
            return;
        }

        await event.sender.addBalance(-stockPrice * amount);
        await event.sender.addStock(stock.name, amount);

        await event.reply({
            type: "text",
            body: `Bought **${amount}** shares of \`$${stock.name}\` at ${formatBalance(stockPrice)} (${formatBalance(
                stockPrice * amount,
            )} total).`,
        });
    },
});
