import { UserArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";
import { clamp, randint } from "../util/math.ts";

const successfulAttacks: {
    description: string;
}[] = [
    {
        description: "You kill $TARGET in a drive-by shooting!",
    },
    {
        description:
            "You stab $TARGET in the back with a rusty knife, giving them tetanus.",
    },
    {
        description: "You shoot $TARGET with a shotgun to the chest!",
    },
    {
        description: "$TARGET slips on a conveniently placed banana.",
    },
    {
        description:
            "You expose $TARGET on Reddit, causing them to be swarmed by a gang of angry incels.",
    },
];

const failedAttacks: {
    description: string;
}[] = [
    {
        description:
            "You miss $TARGET and hit an angry gorilla instead. You are beaten up badly.",
    },
    {
        description:
            "You trip over your own shoelaces and fall flat on your face.",
    },
    {
        description:
            "You step on a landmine and explode into a million pieces.",
    },
    {
        description:
            "You accidentally shoot yourself in the foot while debugging your killer robot's kernel.",
    },
    {
        description:
            "You try to shoot $TARGET, but your gun jams and explodes in your face.",
    },
];

const SUCCESS_CHANCE = 0.4;
const MIN_MONEY = 50;
const MAX_MONEY = 400;
const REQUIRED_BALANCE = 10;

export default defineCommand({
    name: "attack",
    description: "Savagely attack another user",
    aliases: ["shiv"],
    args: {
        target: new UserArgument("target", true, {
            description: "The user to attack",
        }),
    },
    cooldownSeconds: 60,
    execute: async ({ target }, event): Promise<void> => {
        const isSuccessful = Math.random() < SUCCESS_CHANCE;
        const senderBalance = await event.sender.getBalance();
        const targetBalance = await target.getBalance();

        if (senderBalance < REQUIRED_BALANCE) {
            await event.reply({
                type: "text",
                body: "You are too poor to attack someone!",
            });
            return;
        }

        if (targetBalance < REQUIRED_BALANCE) {
            await event.reply({
                type: "text",
                body: `${target.mxid} is too poor to be attacked!`,
                mentions: [target],
            });
            return;
        }

        if (isSuccessful) {
            const attack = successfulAttacks[
                Math.floor(Math.random() * successfulAttacks.length)
            ] as (typeof successfulAttacks)[number];

            const money = clamp(
                randint(MIN_MONEY, MAX_MONEY),
                0,
                targetBalance,
            );

            await event.sender.addBalance(money);
            await target.addBalance(-money);

            await event.reply({
                type: "text",
                body: `${attack.description.replace("$TARGET", target.mxid)}\n\nYou steal ${formatBalance(money)} from ${target.mxid}!`,
                mentions: [target],
            });
        } else {
            const attack = failedAttacks[
                Math.floor(Math.random() * failedAttacks.length)
            ] as (typeof failedAttacks)[number];

            const money = clamp(
                randint(MIN_MONEY, MAX_MONEY),
                0,
                senderBalance,
            );

            await event.sender.addBalance(-money);
            await target.addBalance(money);

            await event.reply({
                type: "text",
                body: `${attack.description.replace("$TARGET", target.mxid)}\n\nYou lose ${formatBalance(money)} to ${target.mxid}!`,
                mentions: [target],
            });
        }
    },
});
