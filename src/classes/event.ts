import { client } from "../../index.ts";
import { User } from "./user.ts";

type EventType = "reaction" | "text";

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
                return "text";
            case "m.reaction":
                return "reaction";
            default:
                return null;
        }
    }
}

export class ReactionEvent extends Event {
    public get reaction(): string {
        if (this.content?.["m.relates_to"]?.key) {
            return this.content["m.relates_to"].key;
        }

        throw new Error("No reaction found");
    }

    public getTarget(): Promise<Event | null> {
        if (this.content?.["m.relates_to"]?.event_id) {
            return Event.fromMatrixEventId(
                this.roomId,
                this.content["m.relates_to"].event_id,
            );
        }

        throw new Error("No target found");
    }
}

export class TextEvent extends Event {
    public get body(): string {
        return Event.parseBody(this.content.body);
    }

    public async getReplyTarget(): Promise<TextEvent | null> {
        if (this.inReplyToId) {
            const eventData = await client.client.getEvent(
                this.roomId,
                this.inReplyToId,
            );

            if (Event.parseMatrixType(eventData.type) !== "text") {
                return null;
            }

            return new TextEvent(eventData);
        }

        return null;
    }

    public isText(): boolean {
        return this.content.msgtype === "m.text";
    }
}
