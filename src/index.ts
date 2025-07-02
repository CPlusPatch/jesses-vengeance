import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { input } from "@inquirer/prompts";
import { createClient } from "@redis/client";
import { env, file, Glob, write } from "bun";
import consola from "consola";
import {
    AutojoinRoomsMixin,
    MatrixAuth,
    MatrixClient,
    RustSdkCryptoStorageProvider,
    SimpleFsStorageProvider,
} from "matrix-bot-sdk";
import {
    detectKeyword,
    isUnderCooldown,
    pickRandomResponse,
    setCooldown,
} from "./autoresponder.ts";
import { Event, MessageEvent, ReactionEvent } from "./classes/event.ts";
import {
    type CommandManifest,
    type PossibleArgs,
    parseArgs,
} from "./commands.ts";
import { config } from "./config.ts";
import { recalculateTotalWealth } from "./currency.ts";
import { calculateResponse } from "./util/dad.ts";
import { createEvent } from "./util/event.ts";
import { formatRelativeTime } from "./util/math.ts";

const credentialsFile = file(env.CREDENTIALS_FILE || "./credentials.json");

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

        const handleEvent = async (
            roomId: string,
            e: unknown,
        ): Promise<void> => {
            try {
                await this.handleEvent(roomId, e);
            } catch (e) {
                const [eventType, eventContent] = createEvent({
                    type: "text",
                    body: `## Exception while running command:\n\n\`\`\`\n${e}\n\`\`\``,
                    replyTargetId: (e as { event_id: string }).event_id,
                });
                consola.error(e);

                await this.client.sendEvent(roomId, eventType, eventContent);
                return;
            }
        };

        // We don't directly use the event handler, because otherwise we get a confusing "this" context
        this.client.on("room.event", handleEvent);

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

        consola.info("Running wealth recalculation job...");
        await recalculateTotalWealth();
        consola.info("Wealth recalculated!");
    }

    /**
     * Read the commands/ directory and load all the ts files as commands.
     */
    private async loadCommands(): Promise<void> {
        const commands = await readdir(join(import.meta.dir, "commands"));

        for (const command of commands) {
            const module = await import(`./commands/${command}`);

            if (!module.default.disabled) {
                this.commands.push(module.default);
            }
        }
    }

    private async handleReaction(event: ReactionEvent): Promise<void> {
        const target = await event.getTarget();

        // Delete the reacted message if the reaction is a trash emoji
        if (
            event.reaction &&
            target &&
            ["🗑️", "🚮", "🚫", "❌️"].includes(event.reaction) &&
            (await target.sender.isBot())
        ) {
            // Check if the message is from the bot
            await this.client.redactEvent(
                event.roomId,
                target.id,
                `Redaction requested by ${event.sender.mxid}`,
            );
        }
    }

    private async handleEvent(roomId: string, eventData: any): Promise<void> {
        const type = Event.parseMatrixType(eventData.type);

        switch (type) {
            case "message":
                await this.handleMessage(
                    new MessageEvent({
                        ...eventData,
                        room_id: roomId,
                    }),
                );
                break;
            case "reaction":
                await this.handleReaction(
                    new ReactionEvent({
                        ...eventData,
                        room_id: roomId,
                    }),
                );
                break;
            default:
                break;
        }
    }

    private async handleMessage(event: MessageEvent): Promise<void> {
        if (await event.sender.isBot()) {
            return;
        }

        if (!event.isText()) {
            return;
        }

        if (event.body.startsWith(config.commands.prefix)) {
            const commandName = event.body
                .split(" ")[0]
                ?.slice(config.commands.prefix.length)
                .toLowerCase();

            if (!commandName) {
                return;
            }

            if (
                config.users.banned.some((b) =>
                    new Glob(b).match(event.sender.mxid),
                )
            ) {
                await event.reply({
                    type: "text",
                    body: "🖕",
                });
                return;
            }

            const banDetails = await event.sender.isBanned();

            if (banDetails) {
                await event.reply({
                    type: "text",
                    body: `You are banned from this bot.${
                        banDetails.reason
                            ? `\n\nReason: \`${banDetails.reason}\``
                            : ""
                    }\n\nBan expires ${
                        banDetails.duration > 0
                            ? `**${formatRelativeTime(
                                  banDetails.timestamp +
                                      banDetails.duration -
                                      Date.now(),
                              )}**`
                            : "**NEVER!**"
                    }`,
                });
                return;
            }

            const command = this.commands.find(
                (c) =>
                    c.name === commandName || c.aliases?.includes(commandName),
            );

            if (command) {
                // Check cooldown
                const cooldownRemaining = command.cooldownSeconds
                    ? await event.sender.isUnderCooldown(
                          command.name,
                          command.cooldownSeconds,
                      )
                    : false;

                if (cooldownRemaining) {
                    await event.reply({
                        type: "text",
                        body: `You can next use this command **${formatRelativeTime(
                            cooldownRemaining * 1000,
                        )}**`,
                    });

                    return;
                }

                await event.sender.updateLastCommandUsage(
                    command.name,
                    new Date(),
                );

                const args = event.body.split(" ").slice(1);

                let parsedArgs: Awaited<ReturnType<typeof parseArgs>>;

                try {
                    parsedArgs = await parseArgs(args, command, event);
                } catch (e) {
                    await event.reply({
                        type: "text",
                        body: `**Error while parsing arguments:**\n\n${(e as Error).message}`,
                    });
                    return;
                }

                consola.debug(
                    `User ${event.sender.mxid} executed command ${commandName} with args ${JSON.stringify(args)}`,
                );

                await command.execute(parsedArgs, event);
            }
        } else {
            if (event.body.toLowerCase().includes("sigma tuah")) {
                await this.client.sendEvent(
                    event.roomId,
                    ...createEvent({
                        type: "media",
                        url: "mxc://cpluspatch.dev/ZYFgeNrhgtjrSXYZsKCwPQbp",
                        meta: {
                            w: 376,
                            h: 498,
                            mimetype: "image/webp",
                            size: 460926,
                        },
                    }),
                );

                return;
            }

            const keyword = detectKeyword(event.body);

            if (keyword) {
                if (await isUnderCooldown(this, event.roomId)) {
                    return;
                }

                await event.reply({
                    type: "text",
                    body: pickRandomResponse(keyword),
                });

                await setCooldown(this, event.roomId, 60 * 10); // 10 minutes
            }

            // Dadbot functionality
            const response = calculateResponse(event.body, event.sender);

            if (response) {
                if (await isUnderCooldown(this, event.roomId)) {
                    return;
                }

                await event.reply({
                    type: "text",
                    body: response,
                });

                await setCooldown(this, event.roomId, 60 * 10); // 10 minutes
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
