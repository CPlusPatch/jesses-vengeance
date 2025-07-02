import { client } from "../../index.ts";
import {
    createEvent,
    type MediaEventCreationOptions,
    type TextEventCreationOptions,
} from "../util/event.ts";
import {
    type EventHandlerEvents,
    eventManager,
} from "../util/event-manager.ts";
import { User } from "./user.ts";

type EventType = "reaction" | "message";

export class Event {
    public id: string;
    public roomId: string;
    public sender: User;
    public sentAt: Date;
    public type: EventType;
    public content: any;
    public inReplyToId: string | null;

    public constructor(event: any) {
        const type = Event.parseMatrixType(event.type);

        if (!type) {
            throw new Error("Invalid event type");
        }

        const sender = new User(event.sender);
        const sentAt = new Date(event.origin_server_ts);
        const replyId =
            (event.content?.["m.relates_to"]?.["m.in_reply_to"]
                ?.event_id as string) ?? null;

        this.id = event.event_id;
        this.roomId = event.room_id;
        this.sender = sender;
        this.sentAt = sentAt;
        this.type = type;
        this.content = event.content;
        this.inReplyToId = replyId;
    }

    public static async fromMatrixEventId(
        roomId: string,
        id: string,
    ): Promise<Event | null> {
        const eventData = await client.client.getEvent(roomId, id);

        return new Event(eventData);
    }

    public static parseBody(body: string | undefined): string {
        return body?.trim() ?? "";
    }

    public static parseMatrixType(
        type: "m.room.message" | "m.reaction" | string,
    ): EventType | null {
        switch (type) {
            case "m.room.message":
                return "message";
            case "m.reaction":
                return "reaction";
            default:
                return null;
        }
    }

    /**
     * Register a handler for when this event receives a reply
     */
    public onReply(
        handler: (data: EventHandlerEvents["reply"]) => void,
    ): () => void {
        const eventHandler = (data: EventHandlerEvents["reply"]) => {
            if (data.originalEvent.id === this.id) {
                handler(data);
            }
        };

        eventManager.on("reply", eventHandler);

        // Return unsubscribe function
        return () => eventManager.off("reply", eventHandler);
    }

    /**
     * Register a handler for when this event receives a reaction
     */
    public onReaction(
        handler: (data: EventHandlerEvents["reaction"]) => void,
    ): () => void {
        const eventHandler = (data: EventHandlerEvents["reaction"]) => {
            if (data.originalEvent.id === this.id) {
                handler(data);
            }
        };

        eventManager.on("reaction", eventHandler);

        // Return unsubscribe function
        return () => eventManager.off("reaction", eventHandler);
    }
}

export class ReactionEvent extends Event {
    public get reaction(): string {
        if (this.content?.["m.relates_to"]?.key) {
            return this.content["m.relates_to"].key;
        }

        throw new Error("No reaction found");
    }

    public getTarget(): Promise<MessageEvent | null> {
        if (this.content?.["m.relates_to"]?.event_id) {
            return MessageEvent.fromMatrixEventId(
                this.roomId,
                this.content["m.relates_to"].event_id,
            );
        }

        throw new Error("No target found");
    }
}

export class MessageEvent extends Event {
    public get body(): string {
        return Event.parseBody(this.content.body);
    }

    public static async fromMatrixEventId(
        roomId: string,
        id: string,
    ): Promise<MessageEvent | null> {
        const eventData = await client.client.getEvent(roomId, id);

        return new MessageEvent(eventData);
    }

    public async getReplyTarget(): Promise<MessageEvent | null> {
        if (this.inReplyToId) {
            const eventData = await client.client.getEvent(
                this.roomId,
                this.inReplyToId,
            );

            if (Event.parseMatrixType(eventData.type) !== "message") {
                return null;
            }

            return new MessageEvent(eventData);
        }

        return null;
    }

    public isText(): boolean {
        return ["m.text", "m.notice"].includes(this.content.msgtype);
    }

    public async reply(
        options:
            | Omit<TextEventCreationOptions, "replyTargetId">
            | Omit<MediaEventCreationOptions, "replyTargetId">,
    ): Promise<MessageEvent> {
        const { roomId, id } = this;

        const [eventType, eventContent] = createEvent({
            ...options,
            replyTargetId: id,
            mentions: [...(options.mentions ?? []), this.sender],
        });

        const replyEventId = await client.client.sendEvent(
            roomId,
            eventType,
            eventContent,
        );

        const replyEvent = (await MessageEvent.fromMatrixEventId(
            roomId,
            replyEventId,
        )) as MessageEvent;

        eventManager.emit("reply", {
            originalEvent: this,
            replyEvent,
        });

        return replyEvent;
    }

    public async edit(
        options:
            | Omit<TextEventCreationOptions, "editTargetId" | "replyTargetId">
            | Omit<MediaEventCreationOptions, "editTargetId" | "replyTargetId">,
    ): Promise<string> {
        const { roomId, id, inReplyToId } = this;

        const [eventType, eventContent] = createEvent({
            ...options,
            editTargetId: id,
            replyTargetId: inReplyToId ?? undefined,
        });

        return await client.client.sendEvent(roomId, eventType, eventContent);
    }

    public async react(emoji: string): Promise<string> {
        const { roomId, id } = this;

        const [eventType, eventContent] = createEvent({
            type: "reaction",
            emoji,
            targetId: id,
        });

        return await client.client.sendEvent(roomId, eventType, eventContent);
    }
}
