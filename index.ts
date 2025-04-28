import { serve } from "bun";
import { Bot } from "./src/index.ts";
import { simulateStockPrice, stocks } from "./src/util/finance.ts";

export const client = new Bot();

client.start();

serve({
    port: 16193,
    routes: {
        "/api/v0/stocks/:stock": (req) => {
            const stockName = req.params.stock;

            if (!stocks[stockName]) {
                return new Response("Stock not found", { status: 404 });
            }

            const stock = stocks[stockName];
            const t = Math.ceil(Date.now() / 1000);

            const price = simulateStockPrice(t, stock);

            return Response.json(
                {
                    price,
                    time: t,
                },
                {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "*",
                    },
                },
            );
        },
    },
});
