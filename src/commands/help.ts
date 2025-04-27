import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "help",
    description: "List all commands",
    execute: async (_args, { roomId, id }): Promise<void> => {
        const commands = client.commands
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
            .join("\n");
        await client.sendMessage(
            roomId,
            `Here are all the commands:\n${commands}\n\n**NOTE**: You can also react to messages with 🗑️, 🚮, 🚫 or ❌️ to have them deleted.`,
            {
                replyTo: id,
            },
        );
    },
});
