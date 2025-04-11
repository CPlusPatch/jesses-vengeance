import type { MessageEvent, TextualMessageEventContent } from "matrix-bot-sdk";
import { isValidAmount, isValidNonNegativeAmount } from "./currency.ts";
import type { Bot } from "./index.ts";

export interface Arg {
    name: string;
    description?: string;
    required?: boolean;
    type: "string" | "user" | "currency" | "currency-nonnegative" | "number";
}

export interface CommandManifest {
    name: string;
    description?: string;
    aliases?: string[];
    args?: Arg[];
    execute: (
        client: Bot,
        roomId: string,
        event: MessageEvent<TextualMessageEventContent>,
        args: string[],
    ) => void | Promise<void>;
}

export const getArg = (body: string, index: number): string | undefined => {
    const args = body.split(" ");
    return args[index];
};

export class ArgValidationError extends Error {
    public name = "ArgValidationError";
}

export const validateUserArg = async (
    arg: string,
    client: Bot,
    roomId: string,
): Promise<boolean> => {
    if (!arg.startsWith("@")) {
        return false;
    }

    if (arg === (await client.client.getUserId())) {
        return false;
    }

    if (!(await client.isUserInRoom(roomId, arg))) {
        return false;
    }

    return true;
};

export const validateCurrencyArg = (arg: string): boolean =>
    isValidAmount(Number(arg.replaceAll("$", "").trim()));

export const validateNonNegativeCurrencyArg = (arg: string): boolean =>
    isValidNonNegativeAmount(Number(arg.replaceAll("$", "").trim()));

export const validateNumberArg = (arg: string): boolean =>
    !Number.isNaN(Number(arg.trim()));

export const validateStringArg = (arg: string): boolean => arg.trim() !== "";

export const validateArgs = async (
    client: Bot,
    roomId: string,
    args: string[],
    schemaArgs: Arg[],
): Promise<boolean> => {
    for (const [index, schemaArg] of schemaArgs.entries()) {
        const arg = args[index];

        if (schemaArg.required && !arg) {
            throw new ArgValidationError(
                `Missing required argument: ${schemaArg.name}`,
            );
        }

        if (!arg) {
            continue;
        }

        let result: boolean;

        switch (schemaArg.type) {
            case "user":
                result = await validateUserArg(arg, client, roomId);
                break;
            case "currency":
                result = validateCurrencyArg(arg);
                break;
            case "number":
                result = validateNumberArg(arg);
                break;
            case "string":
                result = validateStringArg(arg);
                break;
            case "currency-nonnegative":
                result = validateNonNegativeCurrencyArg(arg);
                break;
        }

        if (!result) {
            throw new ArgValidationError(`Invalid argument: ${schemaArg.name}`);
        }
    }

    return true;
};
