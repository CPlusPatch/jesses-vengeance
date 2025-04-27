import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";
import { getQuote } from "../quote.ts";
import { createEvent } from "../util/event.ts";

export default defineCommand({
    name: "quote",
    description: "Make a message into a quote",
    execute: async (_args, event): Promise<void> => {
        const replyTarget = await event.getReplyTarget();

        if (!replyTarget) {
            await event.reply({
                type: "text",
                body: "This message is not a reply.",
            });
            return;
        }

        if (replyTarget.type !== "message") {
            await event.reply({
                type: "text",
                body: "This is not a reply to a text message.",
            });
            return;
        }

        const { sender, body } = replyTarget;

        if (!body) {
            await event.reply({
                type: "text",
                body: "The reply message is empty.",
            });
            return;
        }

        const { displayname, avatar_url } = await sender.getProfile();

        let avatarFile: { contentType: string; data: Buffer } | undefined;

        if (avatar_url) {
            const urlParts = avatar_url.substr("mxc://".length).split("/");
            const domain = encodeURIComponent(urlParts[0] ?? "");
            const mediaId = encodeURIComponent(
                urlParts[1]?.split("/")[0] ?? "",
            );
            const path = `/_matrix/client/v1/media/download/${domain}/${mediaId}`;
            const res = await client.client.doRequest(
                "GET",
                path,
                { allow_remote: true },
                null,
                undefined,
                true,
                undefined,
                true,
            );

            avatarFile = {
                data: res.body,
                contentType: res.headers["content-type"],
            };
        }

        const avatarDataUrl = avatarFile
            ? `data:${avatarFile.contentType};base64,${await avatarFile.data.toBase64()}`
            : undefined;

        const url = await getQuote(sender.mxid.replace("@", ""), `“${body}”`, {
            avatarUrl: avatarDataUrl,
            displayName: displayname,
        });

        const mxcUrl = await client.client.uploadContentFromUrl(url);

        await client.client.sendEvent(
            event.roomId,
            ...createEvent({
                type: "media",
                url: mxcUrl,
                replyTargetId: event.id,
                meta: {
                    mimetype: "image/png",
                    h: 630,
                    w: 1200,
                },
            }),
        );
    },
});
