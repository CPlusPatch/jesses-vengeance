import consola from "consola";
import type { Bot } from "./index.ts";

export const DEFAULT_BALANCE = 100;
export const AMOUNT_CAP = 1e6;
export const CURRENCY_SYMBOL = "B$";
export const CURRENCY_NAME = "bitchcoins";

export const getUserBalance = async (
    client: Bot,
    userId: string,
): Promise<number> => {
    const balance = await client.redis.get(`balance:${userId}`);

    if (balance === null) {
        await client.redis.set(`balance:${userId}`, String(DEFAULT_BALANCE));
    }

    return balance === null ? DEFAULT_BALANCE : Number(balance);
};

export const setUserBalance = async (
    client: Bot,
    userId: string,
    balance: number,
): Promise<void> => {
    consola.debug(`Setting balance for ${userId} to ${balance}`);
    await client.redis.set(`balance:${userId}`, String(balance));
};

export const formatBalance = (balance: number): string => {
    const formatted = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(balance)
        .replace("$", "B$");

    return `\`${formatted}\``;
};

export const isValidNonNegativeAmount = (amount: number): boolean => {
    return amount > 0 && !Number.isNaN(amount) && amount <= AMOUNT_CAP;
};

export const isValidAmount = (amount: number): boolean => {
    return !Number.isNaN(amount) && amount <= AMOUNT_CAP;
};
