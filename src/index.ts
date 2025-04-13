import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { input } from "@inquirer/prompts";
import { createClient } from "@redis/client";
import { env, file, Glob, write } from "bun";
import consola from "consola";
import MarkdownIt from "markdown-it";
import {
    AutojoinRoomsMixin,
    MatrixAuth,
    MatrixClient,
    MessageEvent,
    RustSdkCryptoStorageProvider,
    SimpleFsStorageProvider,
    type TextualMessageEventContent,
} from "matrix-bot-sdk";
import {
    detectKeyword,
    isUnderCooldown,
    pickRandomResponse,
    setCooldown,
} from "./autoresponder.ts";
import {
    type CommandManifest,
    type PossibleArgs,
    parseArgs,
} from "./commands.ts";
import { config } from "./config.ts";

const credentialsFile = file("credentials.json");

export class Bot {
    public client!: MatrixClient;
    public commands: CommandManifest<Record<string, PossibleArgs>>[] = [];
    public redis = createClient({
        url: config.redis?.url ?? env.REDIS_URL,
    });

    public async start(): Promise<void> {
        const { accessToken } = await this.loadCredentials();

        const storage = new SimpleFsStorageProvider(config.login.store_path);

        const crypto = new RustSdkCryptoStorageProvider(
            config.encryption.store_path,
        );

        this.client = new MatrixClient(
            config.login.homeserver,
            accessToken,
            storage,
            crypto,
        );

        await this.redis.connect();
        consola.info("Redis connected!");

        AutojoinRoomsMixin.setupOnClient(this.client);
        consola.info("AutojoinRoomsMixin setup!");

        const handleMessage = (roomId: string, e: unknown): Promise<void> => {
            try {
                return this.handleMessage(roomId, new MessageEvent(e));
            } catch (e) {
                return this.sendMessage(
                    roomId,
                    `## Exeption while running command:\n\n\`\`\`\n${e}\n\`\`\``,
                    {
                        replyTo: (e as { event_id: string }).event_id,
                    },
                );
            }
        };

        // We don't directly use the event handler, because otherwise we get a confusing "this" context
        this.client.on("room.message", handleMessage);

        if (config.monitoring.health_check_uri) {
            const healthCheck = async (): Promise<void> => {
                const { ok, status } = await fetch(
                    config.monitoring.health_check_uri as string,
                );

                if (!ok) {
                    consola.warn(
                        `Health check failed with status ${status} for ${config.monitoring.health_check_uri}`,
                    );
                }
            };

            setInterval(healthCheck, 1000 * 30);
        }

        await this.loadCommands();
        await this.client.start().then(() => consola.info("Bot started!"));
    }

    /**
     * Send a message to a room. Automatically parses emojis, mentions, and Markdown.
     *
     * @param roomId - The ID of the room to send the message to
     * @param message - The message to send
     */
    public async sendMessage(
        roomId: string,
        message: string,
        options?: {
            replyTo?: string;
            edit?: string;
        },
    ): Promise<void> {
        const md = new MarkdownIt();
        let parsed = md.render(message);

        const mentions = message.match(/@[^\s]+/g)?.map((m) => m);
        const deduplicatedMentions = [...new Set(mentions)];

        if (deduplicatedMentions) {
            for (const mention of deduplicatedMentions) {
                parsed = parsed.replaceAll(
                    mention,
                    `<a href="https://matrix.to/#/${mention}">${mention}</a>`,
                );
            }
        }

        await this.client.sendMessage(roomId, {
            msgtype: "m.notice",
            body: message,
            format: "org.matrix.custom.html",
            formatted_body: parsed,
            "m.mentions": mentions
                ? {
                      user_ids: mentions,
                  }
                : undefined,
            ...(options?.replyTo
                ? {
                      "m.relates_to": {
                          "m.in_reply_to": {
                              event_id: options.replyTo,
                          },
                      },
                  }
                : undefined),
            ...(options?.edit
                ? {
                      "m.new_content": {
                          msgtype: "m.notice",
                          body: message,
                          format: "org.matrix.custom.html",
                          formatted_body: parsed,
                      },
                      "m.relates_to": {
                          rel_type: "m.replace",
                          event_id: options.edit,
                      },
                  }
                : undefined),
        });
    }

    public async sendMedia(
        roomId: string,
        mxcUrl: string,
        options: {
            replyTo?: string;
            edit?: string;
            sticker?: boolean;
        },
    ): Promise<void> {
        await this.client.sendEvent(
            roomId,
            options.sticker ? "m.sticker" : "m.room.message",
            {
                msgtype: options.sticker ? undefined : "m.image",
                body: "Image",
                url: mxcUrl,
                ...(options?.replyTo
                    ? {
                          "m.relates_to": {
                              "m.in_reply_to": {
                                  event_id: options.replyTo,
                              },
                          },
                      }
                    : undefined),
                ...(options?.edit
                    ? {
                          "m.relates_to": {
                              rel_type: "m.replace",
                              event_id: options.edit,
                          },
                      }
                    : undefined),
            },
        );
    }

    /**
     * Read the commands/ directory and load all the ts files as commands.
     */
    private async loadCommands(): Promise<void> {
        const commands = await readdir(join(import.meta.dir, "commands"));

        for (const command of commands) {
            const module = await import(`./commands/${command}`);
            this.commands.push(module.default);
        }
    }

    private async handleMessage(
        roomId: string,
        event: MessageEvent<TextualMessageEventContent>,
    ): Promise<void> {
        const {
            sender,
            content: { body, msgtype },
            eventId,
        } = event;

        if ((await this.client.getUserId()) === sender) {
            return;
        }

        if (msgtype === "m.notice" || !body) {
            return;
        }

        if (body?.trim().startsWith(config.commands.prefix)) {
            const commandName = body
                .split(" ")[0]
                ?.slice(config.commands.prefix.length)
                .toLowerCase();

            if (!commandName) {
                return;
            }

            if (config.users.banned.some((b) => new Glob(b).match(sender))) {
                await this.sendMessage(roomId, "🖕", {
                    replyTo: eventId,
                });
                return;
            }

            const command = this.commands.find(
                (c) =>
                    c.name === commandName || c.aliases?.includes(commandName),
            );

            if (command) {
                const args = body.split(" ").slice(1);

                let parsedArgs: Awaited<ReturnType<typeof parseArgs>>;

                try {
                    parsedArgs = await parseArgs(args, command, this, {
                        roomId,
                        event,
                    });
                } catch (e) {
                    return await this.sendMessage(
                        roomId,
                        `## Error while parsing arguments:\n\n${(e as Error).message}`,
                        {
                            replyTo: eventId,
                        },
                    );
                }

                consola.debug(
                    `User ${sender} executed command ${commandName} with args ${JSON.stringify(args)}`,
                );

                await command.execute(this, parsedArgs, {
                    roomId,
                    event,
                });
            }
        } else {
            const keyword = detectKeyword(body);

            if (keyword) {
                if (await isUnderCooldown(this, roomId)) {
                    return;
                }

                await this.sendMessage(roomId, pickRandomResponse(keyword), {
                    replyTo: eventId,
                });

                await setCooldown(this, roomId, 60);
            }
        }
    }

    public async isUserInRoom(
        roomId: string,
        userId: string,
    ): Promise<boolean> {
        return (
            (await this.client.getJoinedRoomMembers(roomId)).find(
                (member) => member === userId,
            ) !== undefined
        );
    }

    private async loadCredentials(): Promise<{
        accessToken: string;
    }> {
        if (!(await credentialsFile.exists())) {
            const auth = new MatrixAuth(config.login.homeserver);

            // Ask for password
            const password = await input({
                message: "Credentials not found. Please enter your password.",
            });

            const client = await auth.passwordLogin(
                config.login.username,
                password,
            );

            write(
                credentialsFile,
                JSON.stringify({
                    accessToken: client.accessToken,
                }),
            );
        }

        return credentialsFile.json();
    }
}
