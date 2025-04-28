import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "help",
    description: "List all commands",
    execute: async (_args, event): Promise<void> => {
        const commandsByCategory = client.commands.reduce(
            (acc, command) => {
                const category = command.category || "none";

                if (!acc[category]) {
                    acc[category] = [];
                }

                acc[category].push(command);
                return acc;
            },
            {} as Record<string, typeof client.commands>,
        );

        const commands = Object.entries(commandsByCategory)
            .map(
                ([category, commands]) =>
                    `${category !== "none" ? `## ${category}` : ""}\n${commands
                        .map(
                            (c) =>
                                `- **${c.name}**${
                                    (c.aliases?.length ?? 0) > 0
                                        ? ` (${c.aliases?.map((a) => `**${a}**`).join(", ")})`
                                        : ""
                                } ${
                                    Object.keys(c.args ?? {}).length > 0
                                        ? `${Object.keys(c.args ?? {})
                                              .map((k) => `\`${k}\``)
                                              .join(", ")}`
                                        : ""
                                } - ${c.description}`,
                        )
                        .join("\n")}`,
            )
            .join("\n\n");

        await event.reply({
            type: "text",
            body: `Here are all the commands:\n${commands}\n\n**NOTE**: You can also react to messages with 🗑️, 🚮, 🚫 or ❌️ to have them deleted.`,
        });
    },
});
