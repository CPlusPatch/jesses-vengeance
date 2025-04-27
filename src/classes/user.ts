import { client } from "../../index.ts";
import { getOwnedItems, type ShopItem, setOwnedItems } from "../shop.ts";
import { clamp, roundCurrency } from "../util/math.ts";

const DEFAULT_BALANCE = 100;
const AMOUNT_CAP = 1e6;
const CURRENCY_SYMBOL = "B$";
const CURRENCY_NAME = "bitchcoins";
const BALANCES_KEY = "balances";
const BANNED_USERS_KEY = "banned_users";
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

    public async getBalance(): Promise<number> {
        const score = await client.redis.zScore(BALANCES_KEY, this.mxid);

        if (score === null) {
            return this.setBalance(DEFAULT_BALANCE);
        }

        return score;
    }

    public async setBalance(balance: number): Promise<number> {
        const finalBalance = clamp(roundCurrency(balance), 0, AMOUNT_CAP);

        await client.redis.zAdd(BALANCES_KEY, {
            score: finalBalance,
            value: this.mxid,
        });

        return finalBalance;
    }

    public async addBalance(amount: number): Promise<number> {
        const balance = await this.getBalance();

        return this.setBalance(balance + amount);
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
}
