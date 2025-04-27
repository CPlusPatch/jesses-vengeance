import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";

export default defineCommand({
    name: "sussex",
    description: "Discover what got me banned from r/sussex",
    aliases: ["s"],
    execute: async (_args, { roomId, id }): Promise<void> => {
        await client.sendMedia(
            roomId,
            "mxc://cpluspatch.dev/pyjPIqccXFUuViLOPgGCyflT",
            {
                replyTo: id,
                sticker: true,
            },
        );
    },
});
