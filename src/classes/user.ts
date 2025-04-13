import type { Bot } from "../index.ts";
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
    public constructor(
        public mxid: string,
        private client: Bot,
    ) {}

    public getProfile(): Promise<UserProfile> {
        return this.client.client.getUserProfile(this.mxid);
    }

    public async isBanned(): Promise<BanDetails | null> {
        const banned = await this.client.redis.hGet(
            BANNED_USERS_KEY,
            this.mxid,
        );

        console.log(banned);

        if (!banned) {
            return null;
        }

        const details = JSON.parse(banned) as BanDetails;

        console.log(details);

        if (
            details.duration > 0 &&
            details.timestamp + details.duration < Date.now()
        ) {
            await this.client.redis.hDel(BANNED_USERS_KEY, this.mxid);
            return null;
        }

        return details;
    }

    public async ban(durationSeconds: number, reason?: string): Promise<void> {
        await this.client.redis.hSet(
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
        const score = await this.client.redis.zScore(BALANCES_KEY, this.mxid);

        if (score === null) {
            return this.setBalance(DEFAULT_BALANCE);
        }

        return score;
    }

    public async setBalance(balance: number): Promise<number> {
        const finalBalance = clamp(roundCurrency(balance), 0, AMOUNT_CAP);

        await this.client.redis.zAdd(BALANCES_KEY, {
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
        const items = await getOwnedItems(this.client, this.mxid);

        return items;
    }

    public async addOwnedItem(item: ShopItem): Promise<ShopItem[]> {
        const items = await this.getOwnedItems();

        await setOwnedItems(this.client, this.mxid, [...items, item]);

        return [...items, item];
    }

    public async removeOwnedItem(item: ShopItem): Promise<ShopItem[]> {
        const items = await this.getOwnedItems();

        await setOwnedItems(
            this.client,
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
