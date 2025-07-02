import { client } from "../../index.ts";
import {
    AMOUNT_CAP,
    BALANCES_KEY,
    BANK_BALANCES_KEY,
    DEFAULT_BALANCE,
    TOTAL_WEALTH_KEY,
} from "../currency.ts";
import { getOwnedItems, type ShopItem, setOwnedItems } from "../shop.ts";
import { clamp, roundCurrency } from "../util/math.ts";

const BANNED_USERS_KEY = "banned_users";
const COMMAND_USE_KEY = "command_use";
const STOCK_KEY = "stocks";

interface UserProfile {
    displayname?: string;
    avatar_url?: string;
}

interface BanDetails {
    reason?: string;
    timestamp: number;
    duration: number;
}

export class User {
    public constructor(public mxid: string) {}

    public getProfile(): Promise<UserProfile> {
        return client.client.getUserProfile(this.mxid).catch(() => ({}));
    }

    public async isBanned(): Promise<BanDetails | null> {
        const banned = await client.redis.hGet(BANNED_USERS_KEY, this.mxid);

        if (!banned) {
            return null;
        }

        const details = JSON.parse(banned) as BanDetails;

        if (
            details.duration > 0 &&
            details.timestamp + details.duration < Date.now()
        ) {
            await client.redis.hDel(BANNED_USERS_KEY, this.mxid);
            return null;
        }

        return details;
    }

    public async isBot(): Promise<boolean> {
        return (await client.client.getUserId()) === this.mxid;
    }

    public isInRoom(roomId: string): Promise<boolean> {
        return client.isUserInRoom(roomId, this.mxid);
    }

    public async ban(durationSeconds: number, reason?: string): Promise<void> {
        await client.redis.hSet(
            BANNED_USERS_KEY,
            this.mxid,
            JSON.stringify({
                reason,
                timestamp: Date.now(),
                duration: durationSeconds * 1000,
            }),
        );
    }

    public async unban(): Promise<void> {
        await client.redis.hDel(BANNED_USERS_KEY, this.mxid);
    }

    public async getBalance(): Promise<number> {
        const score = await client.redis.zScore(BALANCES_KEY, this.mxid);

        if (score === null) {
            return this.setBalance(DEFAULT_BALANCE);
        }

        return score;
    }

    public async getBankBalance(): Promise<number> {
        const score = await client.redis.zScore(BANK_BALANCES_KEY, this.mxid);

        if (score === null) {
            return 0;
        }

        return score;
    }

    public async setBalance(balance: number): Promise<number> {
        const finalBalance = clamp(roundCurrency(balance), 0, AMOUNT_CAP);

        await client.redis.zAdd(BALANCES_KEY, {
            score: finalBalance,
            value: this.mxid,
        });

        const currentBankBalance = await this.getBankBalance();
        await client.redis.zAdd(TOTAL_WEALTH_KEY, {
            score: finalBalance + currentBankBalance,
            value: this.mxid,
        });

        return finalBalance;
    }

    public async setBankBalance(balance: number): Promise<number> {
        const finalBalance = clamp(roundCurrency(balance), 0, AMOUNT_CAP);

        await client.redis.zAdd(BANK_BALANCES_KEY, {
            score: finalBalance,
            value: this.mxid,
        });

        const currentBalance = await this.getBalance();
        await client.redis.zAdd(TOTAL_WEALTH_KEY, {
            score: finalBalance + currentBalance,
            value: this.mxid,
        });

        return finalBalance;
    }

    public async addBalance(amount: number): Promise<number> {
        const balance = await this.getBalance();

        return this.setBalance(balance + amount);
    }

    public async addBankBalance(amount: number): Promise<number> {
        const balance = await this.getBankBalance();

        return this.setBankBalance(balance + amount);
    }

    public async getOwnedItems(): Promise<ShopItem[]> {
        const items = await getOwnedItems(this.mxid);

        return items;
    }

    public async addOwnedItem(item: ShopItem): Promise<ShopItem[]> {
        const items = await this.getOwnedItems();

        await setOwnedItems(this.mxid, [...items, item]);

        return [...items, item];
    }

    public async removeOwnedItem(item: ShopItem): Promise<ShopItem[]> {
        const items = await this.getOwnedItems();

        await setOwnedItems(
            this.mxid,
            items.filter((i) => i.id !== item.id),
        );

        return items.filter((i) => i.id !== item.id);
    }

    public async ownsItem(item: ShopItem): Promise<boolean> {
        const items = await this.getOwnedItems();

        return items.some((i) => i.id === item.id);
    }

    public async getOwnedStocks(): Promise<{
        [key: string]: number;
    }> {
        const stocks = await client.redis.hGetAll(`${STOCK_KEY}:${this.mxid}`);

        if (!stocks) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(stocks).map(([key, value]) => [key, Number(value)]),
        );
    }

    public async updateLastCommandUsage(
        commandName: string,
        timestamp: Date,
    ): Promise<void> {
        await client.redis.hSet(
            `${COMMAND_USE_KEY}:${this.mxid}`,
            commandName,
            timestamp.getTime(),
        );
    }

    public async getLastCommandUsage(
        commandName: string,
    ): Promise<Date | null> {
        const lastUsed = await client.redis.hGet(
            `${COMMAND_USE_KEY}:${this.mxid}`,
            commandName,
        );

        if (!lastUsed) {
            return null;
        }

        return new Date(Number(lastUsed));
    }

    public async isUnderCooldown(
        commandName: string,
        cooldownSecs: number,
    ): Promise<number | false> {
        const lastUsed = await this.getLastCommandUsage(commandName);

        if (!lastUsed) {
            return false;
        }

        const cooldownEnd = new Date(lastUsed.getTime() + cooldownSecs * 1000);
        const remainingTime = cooldownEnd.getTime() - Date.now();

        if (remainingTime > 0) {
            return Math.ceil(remainingTime / 1000);
        }

        return false;
    }
}
