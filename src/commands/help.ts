import type { CommandManifest } from "../commands.ts";

export default {
    name: "help",
    description: "List all commands",
    execute: async (client, roomId, event): Promise<void> => {
        const commands = client.commands
            .map(
                (c) =>
                    `- \`${c.name}\` ${
                        (c.aliases?.length ?? 0) > 0
                            ? `(\`${c.aliases?.join("`, `")}\`)`
                            : ""
                    } - ${c.description}`,
            )
            .join("\n");
        await client.sendMessage(
            roomId,
            `Here are all the commands:\n${commands}`,
            {
                replyTo: event.eventId,
            },
        );
    },
} satisfies CommandManifest;
