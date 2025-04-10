import type { CommandManifest } from "../commands.ts";

export default {
    name: "sussex",
    description: "Discover what got me banned from r/sussex",
    aliases: ["s"],
    execute: async (client, roomId, event): Promise<void> => {
        await client.sendMedia(
            roomId,
            "mxc://cpluspatch.dev/pyjPIqccXFUuViLOPgGCyflT",
            {
                replyTo: event.eventId,
                sticker: true,
            },
        );
    },
} satisfies CommandManifest;
