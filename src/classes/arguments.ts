import { client } from "../../index.ts";
import type { ShopItem } from "../shop.ts";
import { shopItems } from "../shop.ts";
import { type Stock, type StockParameters, stocks } from "../util/finance.ts";
import { roundCurrency } from "../util/math.ts";
import type { Event } from "./event.ts";
import { User } from "./user.ts";

class ArgumentValidationError extends Error {
    public name = "ArgumentValidationError";
}

export function optionalArg<T>(value: T): T & {
    required: false;
} {
    return value as T & {
        required: false;
    };
}

export abstract class Argument<Value, IsRequired extends boolean> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
            default: Value;
        }>,
    ) {}

    public abstract validate(
        arg: string,
        event: Event,
    ): Promise<boolean> | boolean;

    public abstract parse(arg: string, event: Event): Promise<Value> | Value;
}

export class StringArgument<IsRequired extends boolean> extends Argument<
    string,
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
        }>,
    ) {
        super(name, required, options);
    }

    public validate(arg: string): boolean {
        return arg.trim() !== "";
    }

    public parse(arg: string): string {
        return arg.trim();
    }
}

export class UserArgument<IsRequired extends boolean> extends Argument<
    User,
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
            default: User;
            canBeOutsideRoom: boolean;
            allowSender: boolean;
        }>,
    ) {
        super(name, required, options);
    }

    private static async parseUserId(
        roomId: string,
        arg: string,
    ): Promise<string | null> {
        // Parsing strategies:
        // 1. MXID
        // 2. Display name
        // 3. Username

        if (arg.match(/^@[^:]*:.+$/)) {
            return arg;
        }

        const users = await client.client.getRoomMembers(roomId);

        const matching = users.find((u) => {
            const displayName = u.content.displayname?.toLowerCase() ?? "";
            return displayName === arg.toLowerCase();
        });

        if (matching) {
            return matching.sender;
        }

        const matchingUser = users.find((u) => {
            const userId = u.sender.split(":")[0]?.replace(/@/, "") ?? "";
            return userId.toLowerCase() === arg.toLowerCase();
        });

        if (matchingUser) {
            return matchingUser.sender;
        }

        return null;
    }

    public async validate(arg: string, event: Event): Promise<boolean> {
        const userId = await UserArgument.parseUserId(event.roomId, arg);

        if (!userId) {
            throw new ArgumentValidationError(
                `\`${arg}\` is not a valid user.`,
            );
        }

        if (userId === (await client.client.getUserId())) {
            throw new ArgumentValidationError(
                "Cannot use the MXID of this bot.",
            );
        }

        if (!this.options?.allowSender && userId === event.sender.mxid) {
            throw new ArgumentValidationError("Cannot use yourself.");
        }

        if (
            !(
                this.options?.canBeOutsideRoom ||
                (await client.isUserInRoom(event.roomId, userId))
            )
        ) {
            throw new ArgumentValidationError(
                `\`${userId}\` is not in the room.`,
            );
        }

        return true;
    }

    public async parse(arg: string, event: Event): Promise<User> {
        const userId = await UserArgument.parseUserId(event.roomId, arg);

        return new User(userId as string);
    }
}

export class CurrencyArgument<IsRequired extends boolean> extends Argument<
    number,
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
            default: number;
            min: number;
            max: number;
        }>,
    ) {
        super(name, required, options);
    }

    public validate(arg: string): boolean {
        const value = Number(arg);

        if (Number.isNaN(value)) {
            throw new ArgumentValidationError(
                `\`${arg}\` is not a valid number.`,
            );
        }

        if (this.options?.min !== undefined && value < this.options.min) {
            throw new ArgumentValidationError(
                `\`${arg}\` is less than the minimum value of ${this.options.min}.`,
            );
        }

        if (this.options?.max !== undefined && value > this.options.max) {
            throw new ArgumentValidationError(
                `\`${arg}\` is greater than the maximum value of ${this.options.max}.`,
            );
        }

        return true;
    }

    public parse(arg: string): number {
        return roundCurrency(Number(arg));
    }
}

export class ShopItemArgument<IsRequired extends boolean> extends Argument<
    ShopItem,
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{ description: string; default: ShopItem }>,
    ) {
        super(name, required, options);
    }

    public validate(arg: string): boolean {
        const item = shopItems.find((item) => item.id === arg);

        if (!item) {
            throw new ArgumentValidationError(
                `\`${arg}\` is not a valid shop item ID.`,
            );
        }

        return true;
    }

    public parse(arg: string): ShopItem {
        return shopItems.find((item) => item.id === arg) as ShopItem;
    }
}

export class StockArgument<IsRequired extends boolean> extends Argument<
    Stock,
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
            default: Stock;
        }>,
    ) {
        super(name, required, options);
    }

    public validate(arg: string): boolean {
        return Object.entries(stocks).some(
            ([key]) => key.toLowerCase() === arg.toLowerCase(),
        );
    }

    public parse(arg: string): Stock {
        const stock = stocks[arg as keyof typeof stocks] as StockParameters;

        return {
            name: arg,
            parameters: stock,
        };
    }
}
