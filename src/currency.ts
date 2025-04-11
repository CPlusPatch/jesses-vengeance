import consola from "consola";
import type { Bot } from "./index.ts";

export const DEFAULT_BALANCE = 100;
export const AMOUNT_CAP = 1e6;
export const CURRENCY_SYMBOL = "B$";
export const CURRENCY_NAME = "bitchcoins";
const BALANCES_KEY = "balances";

export const getUserBalance = async (
    client: Bot,
    userId: string,
): Promise<number> => {
    const score = await client.redis.zScore(BALANCES_KEY, userId);

    if (score === null) {
        await client.redis.zAdd(BALANCES_KEY, {
            score: DEFAULT_BALANCE,
            value: userId,
        });
        return DEFAULT_BALANCE;
    }

    return score;
};

export const setUserBalance = async (
    client: Bot,
    userId: string,
    balance: number,
): Promise<void> => {
    consola.debug(`Setting balance for ${userId} to ${balance}`);
    await client.redis.zAdd(BALANCES_KEY, { score: balance, value: userId });
};

export const deleteUserBalance = async (
    client: Bot,
    userId: string,
): Promise<void> => {
    await client.redis.zRem(BALANCES_KEY, userId);
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

export const getTopUsers = async (
    client: Bot,
    limit = 10,
): Promise<Array<{ userId: string; balance: number }>> => {
    const topUsers = await client.redis.zRangeWithScores(
        BALANCES_KEY,
        0,
        limit - 1,
        { REV: true },
    );

    return topUsers.map((user: { value: string; score: number }) => ({
        userId: user.value,
        balance: user.score,
    }));
};
