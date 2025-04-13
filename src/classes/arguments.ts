import type { MessageEvent, TextualMessageEventContent } from "matrix-bot-sdk";
import type { Bot } from "../index.ts";
import type { ShopItem } from "../shop.ts";
import { shopItems } from "../shop.ts";
import { type StockParameters, stocks } from "../util/finance.ts";
import { roundCurrency } from "../util/math.ts";
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
        client: Bot,
        context: {
            roomId: string;
            event: MessageEvent<TextualMessageEventContent>;
        },
    ): Promise<boolean> | boolean;

    public abstract parse(arg: string, client: Bot): Promise<Value> | Value;
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
        }>,
    ) {
        super(name, required, options);
    }

    public async validate(
        arg: string,
        client: Bot,
        context: {
            roomId: string;
            event: MessageEvent<TextualMessageEventContent>;
        },
    ): Promise<boolean> {
        if (!arg.match(/^@[^:]*:.+$/)) {
            throw new ArgumentValidationError(
                `\`${arg}\` is not a valid MXID.`,
            );
        }

        if (arg === (await client.client.getUserId())) {
            throw new ArgumentValidationError(
                "Cannot use the MXID of this bot.",
            );
        }

        if (
            !(
                this.options?.canBeOutsideRoom ||
                (await client.isUserInRoom(context.roomId, arg))
            )
        ) {
            throw new ArgumentValidationError(`\`${arg}\` is not in the room.`);
        }

        return true;
    }

    public parse(arg: string, client: Bot): User {
        return new User(arg, client);
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
    [keyof typeof stocks, StockParameters],
    IsRequired
> {
    public constructor(
        public name: string,
        public required: IsRequired,
        public options?: Partial<{
            description: string;
            default: [keyof typeof stocks, StockParameters];
        }>,
    ) {
        super(name, required, options);
    }

    public validate(arg: string): boolean {
        return Object.entries(stocks).some(
            ([key]) => key.toLowerCase() === arg.toLowerCase(),
        );
    }

    public parse(arg: string): [keyof typeof stocks, StockParameters] {
        return [
            arg as keyof typeof stocks,
            stocks[arg as keyof typeof stocks] as StockParameters,
        ];
    }
}
