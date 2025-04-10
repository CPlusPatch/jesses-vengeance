import { readdir } from "node:fs/promises";
import { $, build } from "bun";

await $`rm -rf dist && mkdir dist`;

const commands = await readdir("./src/commands");

await build({
    entrypoints: [
        "./src/index.ts",
        ...commands.map((c) => `./src/commands/${c}`),
    ],
    outdir: "./dist",
    sourcemap: "linked",
    target: "bun",
    splitting: true,
});
