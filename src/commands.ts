import type {
    CurrencyArgument,
    ShopItemArgument,
    StockArgument,
    StringArgument,
    UserArgument,
} from "./classes/arguments.ts";
import type { TextEvent } from "./classes/event.ts";

export type PossibleArgs =
    | StringArgument<boolean>
    | UserArgument<boolean>
    | CurrencyArgument<boolean>
    | ShopItemArgument<boolean>
    | StockArgument<boolean>;

export type RequiredArgs =
    | StringArgument<true>
    | UserArgument<true>
    | CurrencyArgument<true>
    | ShopItemArgument<true>
    | StockArgument<true>;

export interface CommandManifest<
    ArgsRecord extends Record<string, PossibleArgs>,
> {
    name: string;
    description?: string;
    aliases?: string[];
    args?: ArgsRecord;
    disabled?: boolean;
    cooldownSeconds?: number;
    execute: (
        args: {
            [K in keyof ArgsRecord]: ArgsRecord[K] extends RequiredArgs
                ? Awaited<ReturnType<ArgsRecord[K]["parse"]>>
                : Awaited<ReturnType<ArgsRecord[K]["parse"]>> | undefined;
        },
        event: TextEvent,
    ) => void | Promise<void>;
}

export const defineCommand = <ArgsRecord extends Record<string, PossibleArgs>>(
    manifest: CommandManifest<ArgsRecord>,
): CommandManifest<ArgsRecord> => manifest;

export const parseArgs = async <
    ArgsRecord extends Record<string, PossibleArgs>,
>(
    args: string[],
    manifest: CommandManifest<ArgsRecord>,
    event: TextEvent,
): Promise<{
    [K in keyof ArgsRecord]: Awaited<ReturnType<ArgsRecord[K]["parse"]>>;
}> => {
    const parsedArgs = {} as {
        [K in keyof ArgsRecord]: Awaited<ReturnType<ArgsRecord[K]["parse"]>>;
    };

    for (const [index, name, arg] of Object.entries(manifest.args ?? {}).map(
        (a, index) => [index, ...a] as const,
    )) {
        const argText = args[index];

        if (!argText) {
            if (arg.required) {
                throw new Error(`Missing required argument ${name}`);
            }

            continue;
        }

        // Validate the argument (will throw if invalid, this will need to be handled by the caller of this function)
        if (!(await arg.validate(argText, event))) {
            throw new Error(`Invalid argument ${name}: ${argText}`);
        }

        // Parse the argument
        // @ts-expect-error - This is safe because we know the argument is valid
        parsedArgs[name] = await arg.parse(argText, event);
    }

    return parsedArgs;
};
