import { env } from "bun";
import { watchConfig } from "c12";

interface Config {
    login: {
        homeserver: string;
        username: string;
        store_path: string;
    };
    monitoring: {
        health_check_uri?: string;
    };
    redis?: {
        url?: string;
    };
    commands: {
        prefix: string;
    };
    responses: {
        cooldown: number;
    };
    encryption: {
        store_path: string;
    };
    users: {
        wife: string;
        admin: string[];
        banned: string[];
    };
}

export const config = (
    await watchConfig<Config>({
        configFile: env.CONFIG_FILE || "config.toml",
    })
).config;
