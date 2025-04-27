import MarkdownIt from "markdown-it";
import type { User } from "../classes/user.ts";

const md = new MarkdownIt();

export const mdToHtml = (text: string, mentions: User[]): string => {
    let parsed = md.render(text);

    for (const mention of mentions) {
        parsed = parsed.replaceAll(
            mention.mxid,
            `<a href="https://matrix.to/#/${mention.mxid}">${mention.mxid}</a>`,
        );
    }

    return parsed;
};

interface BaseEventCreationOptions {
    type: "media" | "text" | "reaction";
    mentions?: User[];
    replyTargetId?: string;
    editTargetId?: string;
}

export interface TextEventCreationOptions extends BaseEventCreationOptions {
    type: "text";
    body?: string;
}

export interface MediaEventCreationOptions extends BaseEventCreationOptions {
    type: "media";
    url: string;
    isSticker?: boolean;
    meta?: Partial<{
        w: number;
        h: number;
        mimetype: string;
        size: number;
    }>;
}

export interface ReactionEventCreationOptions {
    type: "reaction";
    emoji: string;
    targetId: string;
}

type EventCreationOptions =
    | TextEventCreationOptions
    | MediaEventCreationOptions
    | ReactionEventCreationOptions;

export const createEvent = (options: EventCreationOptions): [string, any] => {
    let eventType: string;
    const object: any = {};

    switch (options.type) {
        case "media": {
            eventType = options.isSticker ? "m.sticker" : "m.room.message";

            const { isSticker, url, meta = {} } = options;

            object.body = "Image";

            if (!isSticker) {
                object.msgtype = "m.image";
            }

            if (Object.keys(meta).length > 0) {
                object.info = meta;
            }

            object.url = url;

            break;
        }
        case "text": {
            eventType = "m.room.message";
            object.msgtype = "m.notice";

            const { body, mentions = [] } = options;

            if (body) {
                object.body = body;
                object.format = "org.matrix.custom.html";
                object.formatted_body = mdToHtml(body, mentions);
            }

            if (mentions.length > 0) {
                object["m.mentions"] = {
                    user_ids: mentions.map((mention) => mention.mxid),
                };
            }

            break;
        }
        case "reaction": {
            eventType = "m.reaction";

            const { emoji, targetId } = options;

            object["m.relates_to"] = {
                rel_type: "m.annotation",
                event_id: targetId,
                key: emoji,
            };

            break;
        }
    }

    switch (options.type) {
        case "media":
        case "text": {
            if (options.replyTargetId) {
                object["m.relates_to"] = {
                    "m.in_reply_to": {
                        event_id: options.replyTargetId,
                    },
                };
            }

            if (options.editTargetId) {
                object["m.new_content"] = structuredClone(object);

                object["m.relates_to"] = {
                    rel_type: "m.replace",
                    event_id: options.editTargetId,
                };
            }
        }
    }

    return [eventType, object];
};
