import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "sussex",
    description: "Discover what got me banned from r/sussex",
    aliases: ["s"],
    execute: async (client, _args, { roomId, event }): Promise<void> => {
        await client.sendMedia(
            roomId,
            "mxc://cpluspatch.dev/pyjPIqccXFUuViLOPgGCyflT",
            {
                replyTo: event.eventId,
                sticker: true,
            },
        );
    },
});
