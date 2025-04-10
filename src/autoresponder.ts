import responses from "./responses.json" with { type: "json" };

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
