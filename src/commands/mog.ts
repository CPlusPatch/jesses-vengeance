import { client } from "../../index.ts";
import { UserArgument } from "../classes/arguments.ts";
import { defineCommand } from "../commands.ts";
import { config } from "../config.ts";

export default defineCommand({
    name: "mog",
    description: "Become anyone!",
    args: {
        target: new UserArgument("target", false, {
            description: "User to impersonate",
            canBeOutsideRoom: true,
        }),
    },
    execute: async ({ target }, event): Promise<void> => {
        if (!config.users.admin.includes(event.sender.mxid)) {
            await event.reply({
                type: "text",
                body: "You are not authorized to use this command",
            });
            return;
        }

        if (!target) {
            // Reset profile to normal
            const { avatar_url, displayname } =
                await client.client.getUserProfile(
                    await client.client.getUserId(),
                );

            await client.client.sendStateEvent(
                event.roomId,
                "m.room.member",
                await client.client.getUserId(),
                {
                    displayname,
                    avatar_url,
                    membership: "join",
                },
            );

            return;
        }

        const profile = await target.getProfile().catch(() => null);

        if (!profile) {
            await event.reply({
                type: "text",
                body: "User does not have a profile",
            });
            return;
        }

        const { displayname, avatar_url } = profile;

        await client.client.sendStateEvent(
            event.roomId,
            "m.room.member",
            await client.client.getUserId(),
            {
                // Insert U+00AD to prevent disambiguation
                displayname: displayname?.split("").join("­"),
                avatar_url,
                membership: "join",
            },
        );
    },
});
