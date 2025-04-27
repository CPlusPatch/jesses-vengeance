/**
 * Inspired by dadbot
 * @see https://github.com/AlekEagle/dadbot/blob/master/src/events/AutoResponse.ts
 * Thanks, dad!
 */
import type { User } from "../classes/user.ts";

const IM_MATCH = /\b((?:i|l)(?:(?:'|`|‛|‘|’|′|‵)?m| am)) ([\s\S]*)/i;
const KYS_MATCH = /\b(kys|kill\byour\s?self)\b/i;
const WINNING_MATCH = /\b(?:play|played|playing)\b/i;
const SHUT_UP_MATCH = /\b(stfu|shut\s(?:the\s)?(?:fuck\s)?up)\b/i;
const GOODBYE_MATCH = /\b(?:good)? ?bye\b/i;
const THANKS_MATCH = /\b(?:thank you|thanks) bot\b/i;

/**
 * Calculates whether a message has enough uppercase characters to be considered "shouting"
 */
function isShouting(text: string): boolean {
    const individualCharacters = text.split("").filter((a) => !a.match(/\s/));

    // If the message has no spaces, it's not shouting (probably)
    if (text.indexOf(" ") === -1) {
        return false;
    }

    const uppercaseCharacters = individualCharacters.filter((a) =>
        a.match(/[A-Z]/),
    ).length;

    // If the message has more than 60% uppercase characters, it's shouting
    return uppercaseCharacters / individualCharacters.length >= 0.6;
}

const goodbyes = [
    "Bye!",
    "Bye, have fun!",
    "Bye, don't get in trouble!",
    "Stay out of trouble!",
    "Be home before 8!",
    "Later champ!",
];

const thankses = [
    "That's what I'm here for.",
    "Don't mention it champ.",
    "Next time just ask.",
    "Oh, uh, you're welcome I guess?",
];

export const calculateResponse = (msg: string, sender: User): string | null => {
    if (msg.match(WINNING_MATCH)) {
        switch (msg.match(WINNING_MATCH)?.[0]) {
            case "play":
                return "I hope ya win son!";
            case "playing":
                return "Are ya winning son?";
            case "played":
                return "Did ya win son?";
        }
    }

    if (msg.match(IM_MATCH)) {
        const imMatchData = msg.match(IM_MATCH);
        return `Hi ${imMatchData?.[2]}, I'm Bot!`;
    }

    if (msg.match(KYS_MATCH)) {
        return "You better mean Kissing Your Self!";
    }

    if (msg.match(SHUT_UP_MATCH)) {
        return `Listen here ${sender.mxid}, I will not tolerate you saying the words that consist of the letters 's h u t  u p' being said in this server, so take your own advice and close thine mouth in the name of the christian minecraft server owner.`;
    }

    if (msg.match(GOODBYE_MATCH)) {
        return goodbyes[Math.floor(Math.random() * goodbyes.length)] || null;
    }

    if (msg.match(THANKS_MATCH)) {
        return thankses[Math.floor(Math.random() * thankses.length)] || null;
    }

    if (isShouting(msg)) {
        return "Keep your voice down!";
    }

    return null;
};
