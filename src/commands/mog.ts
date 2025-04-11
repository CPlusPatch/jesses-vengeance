import type { CommandManifest } from "../commands.ts";
import { config } from "../config.ts";

export default {
    name: "mog",
    description: "Become anyone!",
    args: [
        {
            name: "target",
            description: "The user to become",
            type: "user",
        },
    ],
    execute: async (client, roomId, event, args): Promise<void> => {
        const [target] = args;
        const { sender } = event;

        if (!config.users.admin.includes(sender)) {
            await client.sendMessage(
                roomId,
                "You are not authorized to use this command",
                {
                    replyTo: event.eventId,
                },
            );
            return;
        }

        if (!target) {
            // Reset profile to normal
            const { avatar_url, displayname } =
                await client.client.getUserProfile(
                    await client.client.getUserId(),
                );

            await client.client.sendStateEvent(
                roomId,
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

        const profile = await client.client
            .getUserProfile(target)
            .catch(() => null);

        if (!profile) {
            await client.sendMessage(roomId, "User does not have a profile", {
                replyTo: event.eventId,
            });
            return;
        }

        const { displayname, avatar_url } = profile;

        await client.client.sendStateEvent(
            roomId,
            "m.room.member",
            await client.client.getUserId(),
            {
                displayname,
                avatar_url,
                membership: "join",
            },
        );
    },
} satisfies CommandManifest;
