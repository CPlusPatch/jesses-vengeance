import { MessageEvent, type TextualMessageEventContent } from "matrix-bot-sdk";
import { defineCommand } from "../commands.ts";
import { getQuote } from "../quote.ts";

export default defineCommand({
    name: "quote",
    description: "Make a message into a quote",
    execute: async (
        client,
        _args,
        { roomId, event: { content, eventId } },
    ): Promise<void> => {
        // @ts-expect-error The event isn't typed properly
        const replyEventId = content?.["m.relates_to"]?.["m.in_reply_to"]
            ?.event_id as string;

        if (!replyEventId) {
            await client.sendMessage(roomId, "This message is not a reply.");
            return;
        }

        const replyEvent = new MessageEvent<TextualMessageEventContent>(
            await client.client.getEvent(roomId, replyEventId),
        );

        const {
            content: { body, msgtype },
            sender,
        } = replyEvent;

        if (msgtype !== "m.text") {
            await client.sendMessage(
                roomId,
                "This message is not a text message.",
                { replyTo: eventId },
            );
            return;
        }

        if (!body) {
            await client.sendMessage(roomId, "This message is empty.", {
                replyTo: eventId,
            });
            return;
        }

        const { displayname, avatar_url } = (await client.client
            .getUserProfile(sender)
            .catch(() => ({}))) as {
            displayname?: string;
            avatar_url?: string;
        };

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

        const url = await getQuote(sender.replace("@", ""), `“${body}”`, {
            avatarUrl: avatarDataUrl,
            displayName: displayname,
        });

        const mxcUrl = await client.client.uploadContentFromUrl(url);

        await client.sendMedia(roomId, mxcUrl, {
            replyTo: eventId,
            metadata: {
                contentType: "image/png",
                height: 630,
                width: 1200,
                size: undefined as unknown as number,
            },
        });
    },
});
