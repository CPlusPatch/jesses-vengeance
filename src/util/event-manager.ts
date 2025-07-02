import mitt from "mitt";
import type { MessageEvent, ReactionEvent } from "../classes/event.ts";

export type EventHandlerEvents = {
    reply: { originalEvent: MessageEvent; replyEvent: MessageEvent };
    reaction: { originalEvent: MessageEvent; reactionEvent: ReactionEvent };
};

export const eventManager = mitt<EventHandlerEvents>();
