import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "help",
    description: "List all commands",
    execute: async (client, _args, { roomId, event }): Promise<void> => {
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
            `Here are all the commands:\n${commands}\n\n**NOTE**: You can also react to messages with 🗑️, 🚮, 🚫 or ❌️ to have them deleted.`,
            {
                replyTo: event.eventId,
            },
        );
    },
});
