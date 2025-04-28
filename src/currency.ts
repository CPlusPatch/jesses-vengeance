import { client } from "../index.ts";

export const DEFAULT_BALANCE = 100;
export const AMOUNT_CAP = 1e6;
export const CURRENCY_SYMBOL = "B$";
export const CURRENCY_NAME = "bitchcoins";
export const BALANCES_KEY = "balances";
export const BANK_BALANCES_KEY = "bank_balances";
export const TOTAL_WEALTH_KEY = "total_wealth";

export const formatBalance = (balance: number): string => {
    return `\`${formatBalanceRaw(balance)}\``;
};

export const formatBalanceRaw = (balance: number): string => {
    const formatted = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(balance)
        .replace("$", CURRENCY_SYMBOL);

    return formatted;
};

export const isValidNonNegativeAmount = (amount: number): boolean => {
    return amount > 0 && !Number.isNaN(amount) && amount <= AMOUNT_CAP;
};

export const isValidAmount = (amount: number): boolean => {
    return !Number.isNaN(amount) && amount <= AMOUNT_CAP;
};

export const getTopUsers = async (
    limit = 10,
): Promise<Array<{ userId: string; balance: number }>> => {
    const topUsers = await client.redis.zRangeWithScores(
        TOTAL_WEALTH_KEY,
        0,
        limit - 1,
        { REV: true },
    );

    return topUsers.map((user: { value: string; score: number }) => ({
        userId: user.value,
        balance: user.score,
    }));
};

export const recalculateTotalWealth = async (): Promise<void> => {
    await client.redis.zUnionStore(TOTAL_WEALTH_KEY, [
        BALANCES_KEY,
        BANK_BALANCES_KEY,
    ]);
};
