import { defineCommand } from "../commands.ts";
import { formatBalance } from "../currency.ts";

const jobs: {
    description: string;
    reward: number;
}[] = [
    {
        description: "You sell weed for money and get busted by the cops.",
        reward: -120,
    },
    {
        description: "You get into OnlyFans and make a lot of money.",
        reward: 400,
    },
    {
        description: "You work in the coal mines and get lung cancer.",
        reward: -200,
    },
    {
        description: "You work at McDonald's and get paid minimum wage.",
        reward: 40,
    },
    {
        description:
            "You perform a daring heist on a bank and get away with it.",
        reward: 200,
    },
    {
        description:
            "You work as a janitor and get paid in peanuts by the headmaster.",
        reward: 10,
    },
    {
        description: "You cheat on your wife and get caught.",
        reward: -100,
    },
    {
        description:
            "You spend your days collecting nexy piss to sell it, making a huge profit.",
        reward: 130,
    },
];

export default defineCommand({
    name: "work",
    description: "Work for money",
    cooldownSeconds: 4 * 60 * 60, // 4 hours
    execute: async (_args, event): Promise<void> => {
        const randomJob = jobs[
            Math.floor(Math.random() * jobs.length)
        ] as (typeof jobs)[number];

        await event.sender.addBalance(randomJob.reward);

        await event.reply({
            type: "text",
            body: `${randomJob.description}\n\nReward: ${formatBalance(randomJob.reward)}`,
        });
    },
});
