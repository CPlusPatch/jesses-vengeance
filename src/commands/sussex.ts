import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "sussex",
    description: "Discover what got me banned from r/sussex",
    aliases: ["s"],
    execute: async (_args, event): Promise<void> => {
        await event.reply({
            type: "media",
            isSticker: true,
            url: "mxc://cpluspatch.dev/pyjPIqccXFUuViLOPgGCyflT",
        });
    },
});
