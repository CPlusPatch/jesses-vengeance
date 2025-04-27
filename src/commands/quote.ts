import { client } from "../../index.ts";
import { defineCommand } from "../commands.ts";
import { getQuote } from "../quote.ts";

export default defineCommand({
    name: "quote",
    description: "Make a message into a quote",
    execute: async (_args, { roomId, getReplyTarget, id }): Promise<void> => {
        const replyTarget = await getReplyTarget();

        if (!replyTarget) {
            await client.sendMessage(roomId, "This message is not a reply.", {
                replyTo: id,
            });
            return;
        }

        if (replyTarget.type !== "text") {
            await client.sendMessage(
                roomId,
                "This is not a reply to a text message.",
                {
                    replyTo: id,
                },
            );
            return;
        }

        const { sender, body } = replyTarget;

        if (!body) {
            await client.sendMessage(roomId, "The reply message is empty.", {
                replyTo: id,
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

        await client.sendMedia(roomId, mxcUrl, {
            replyTo: id,
            metadata: {
                contentType: "image/png",
                height: 630,
                width: 1200,
                size: undefined as unknown as number,
            },
        });
    },
});
