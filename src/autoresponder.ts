import type { Bot } from "./index.ts";
import responses from "./responses.json" with { type: "json" };

const COOLDOWN_KEY = "cooldown";

export const pickRandomResponse = (key: keyof typeof responses): string => {
    const availableResponses = responses[key];

    if (Array.isArray(availableResponses)) {
        return availableResponses[
            Math.floor(Math.random() * availableResponses.length)
        ] as string;
    }

    return availableResponses;
};

export const detectKeyword = (
    message: string,
): keyof typeof responses | undefined => {
    const keywords = Object.keys(responses) as (keyof typeof responses)[];

    for (const keyword of keywords) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
            return keyword;
        }
    }

    return undefined;
};

export const setCooldown = async (
    client: Bot,
    roomId: string,
    cooldownSecs: number,
): Promise<void> => {
    await client.redis.zAdd(COOLDOWN_KEY, {
        score: Date.now() + cooldownSecs * 1000,
        value: roomId,
    });
};

export const isUnderCooldown = async (
    client: Bot,
    roomId: string,
): Promise<boolean> => {
    const cooldown = await client.redis.zScore(COOLDOWN_KEY, roomId);

    if (cooldown === null) {
        return false;
    }

    return Date.now() < cooldown;
};
