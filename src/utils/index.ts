import { join } from "node:path";
import { lstatSync, readdirSync } from "node:fs";
import { config } from "dotenv";
import type { Request, Response, NextFunction } from "express";
import {
  APIApplicationCommand,
  APIApplicationCommandInteractionDataOption,
  ApplicationCommandOptionType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from "discord-api-types/v10";
import DiscordRestClient from "./rest.js";
import { ConsoleColors } from "./constants.js";
import { CommandData, CustomIntEmitter, OptionsMap } from "./typings.js";

// exporting everything from here
export * from "./constants.js";
export * from "./rest.js";
export * from "./typings.js";

config();

export const env = {
  PORT: process.env.PORT || 5000,
  DISCORD_API_URL: process.env.DISCORD_API_URL || "https://discord.com/api/v10",
  DISCORD_APP_TOKEN: process.env.DISCORD_APP_TOKEN!,
  DISCORD_APP_PUBLIC_KEY: process.env.DISCORD_APP_PUBLIC_KEY!,
  AI_SYSTEM: process.env.AI_SYSTEM || "You are a helpful assistant.",
};

// find missing values
const missing = Object.entries(env).find(([_, value]) => !value);

if (missing) {
  throw new Error(`Value for "${missing[0]}" is missing`);
}

/**
 * Custom emitter to handle (component) interaction events
 */
export const IntEmitter = new CustomIntEmitter();

/**
 * Commands data cache
 */
export const commandsData = new Map<string, CommandData>();

/**
 * rest client for the discord api
 */
export const rest = new DiscordRestClient(env.DISCORD_APP_TOKEN!);

export async function getInteractionCommands(
  commands?: Omit<APIApplicationCommand, "application_id" | "id" | "version">[],
  dir = "../commands",
) {
  if (!commands) commands = [];
  try {
    const filePath = join(import.meta.dirname, dir);
    const files = readdirSync(filePath);
    for (const file of files) {
      const stat = lstatSync(join(filePath, file));
      if (stat.isDirectory()) {
        await getInteractionCommands(commands, join(dir, file));
      }
      if (file.startsWith("mod")) {
        let { default: Command } = await import(
          join(import.meta.url, "..", dir, file)
        );
        commands.push({
          default_member_permissions: Command.default_member_permissions,
          type: Command.type,
          name: Command.name,
          name_localizations: Command.name_localizations,
          description: Command.description,
          description_localizations: Command.description_localizations,
          dm_permission: Command.dm_permissions,
          options: Command.options,
          contexts: Command.contexts,
          integration_types: Command.integration_types,
          nsfw: Command.nsfw,
        });
      }
    }
    return commands;
  } catch (e) {
    console.error(e);
    return;
  }
}

export async function cacheCommands(dir: string = "../commands") {
  const filePath = join(import.meta.dirname, dir);
  const files = readdirSync(filePath);
  for (const file of files) {
    const stat = lstatSync(join(filePath, file));
    if (stat.isDirectory()) {
      await cacheCommands(join(dir, file));
    }
    if (file.startsWith("mod.")) {
      const { default: Command } = await import(
        join(import.meta.url, "..", dir, file)
      );
      commandsData.set(Command.name, Command);
    }
  }
}

/**
 * Run a command
 */

export async function runCommand(name: string) {
  const Command = commandsData.get(name);
  if (Command) {
    return Command.run;
  }
  return function (res: Response) {
    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "Command not found",
        flags: MessageFlags.Ephemeral,
      },
    });
  };
}

/**
 * Run a command's autocomplete
 */

export async function runCommandAutoComplete(name: string) {
  const Command = commandsData.get(name);
  if (Command && Command.autocomplete) {
    return Command.autocomplete;
  }
  return function (res: Response) {
    return res.json({
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: {
        choices: [],
      },
    });
  };
}

/**
 * Converts data received to options map
 */
export function getOptionsValue(
  data?: APIApplicationCommandInteractionDataOption[],
) {
  const options = new OptionsMap();
  if (!data) return options;
  for (const option of data) {
    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      return getOptionsValue(option.options);
    } else {
      options.set(option.name, option.value);
    }
  }
  return options;
}

/**
 * Get Autocomplete focused field
 */
export function getFocusedField(
  data: APIApplicationCommandInteractionDataOption[],
) {
  for (const option of data) {
    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      return getFocusedField(option.options!);
    } else if ((option as any).focused) {
      return option.name;
    }
  }
  return null;
}

/**
 * returns sub commands and/or sub command groups if any
 * @param dataOptions options gotten from interaction
 * @returns
 */
export function getSub(
  dataOptions?: APIApplicationCommandInteractionDataOption,
) {
  if (!dataOptions) return [];
  if (dataOptions.type === ApplicationCommandOptionType.SubcommandGroup) {
    return [dataOptions.name, dataOptions.options?.[0].name!];
  }
  if (dataOptions.type === ApplicationCommandOptionType.Subcommand) {
    return [dataOptions.name];
  }
  return [];
}

/**
 * nap time!
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * returns current time in ISO format
 * @param shard_id bot shard if any
 * @returns
 */
export function DateInISO(shard_id: number | null = null) {
  return (
    ChangeConsoleColor("FgCyan", "[" + new Date().toISOString() + "]") +
    (shard_id !== null ? ChangeConsoleColor("FgMagenta", ` [${shard_id}]`) : "")
  );
}

/** change color of text in console */
export function ChangeConsoleColor(
  color: keyof typeof ConsoleColors,
  ...value: any[]
) {
  return `${ConsoleColors[color]}${value.map((v) => v).join(" ")}${
    ConsoleColors.Reset
  }`;
}

/** change date-time string to discord timestamp format */
export function DiscordTimestamp(date: string, format: "R" | "f" | "F") {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${format}>`;
}

export function Capitalize(str: string, lowerRest = false) {
  if (lowerRest) str = str.toLowerCase();
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

//! Start :)
//? Source https://github.com/discord/discord-interactions-js/blob/081656ec412ffc3e4ce7ac8c9ab48c67d9996bf5/src/index.ts#L88

/**
 * Based on environment, get a reference to the Web Crypto API's SubtleCrypto interface.
 * @returns An implementation of the Web Crypto API's SubtleCrypto interface.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto.subtle;
  }
  if (typeof crypto !== "undefined") {
    return crypto.subtle;
  }
  if (typeof require === "function") {
    // Cloudflare Workers are doing what appears to be a regex check to look and
    // warn for this pattern. We should never get here in a Cloudflare Worker, so
    // I am being coy to avoid detection and a warning.
    const cryptoPackage = "node:crypto";
    const crypto = require(cryptoPackage);
    return crypto.webcrypto.subtle;
  }
  throw new Error("No Web Crypto API implementation found");
}

export const subtleCrypto = getSubtleCrypto();

/**
 * Converts different types to Uint8Array.
 *
 * @param value - Value to convert. Strings are parsed as hex.
 * @param format - Format of value. Valid options: 'hex'. Defaults to utf-8.
 * @returns Value in Uint8Array form.
 */
export function valueToUint8Array(
  value: Uint8Array | ArrayBuffer | Buffer | string,
  format?: string,
): Uint8Array {
  if (value == null) {
    return new Uint8Array();
  }
  if (typeof value === "string") {
    if (format === "hex") {
      const matches = value.match(/.{1,2}/g);
      if (matches == null) {
        throw new Error("Value is not a valid hex string");
      }
      const hexVal = matches.map((byte: string) => Number.parseInt(byte, 16));
      return new Uint8Array(hexVal);
    }

    return new TextEncoder().encode(value);
  }
  try {
    if (Buffer.isBuffer(value)) {
      return new Uint8Array(value);
    }
  } catch (ex) {
    // Runtime doesn't have Buffer
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  throw new Error(
    "Unrecognized value type, must be one of: string, Buffer, ArrayBuffer, Uint8Array",
  );
}

/**
 * Merge two arrays.
 *
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Concatenated arrays
 */
export function concatUint8Arrays(
  arr1: Uint8Array,
  arr2: Uint8Array,
): Uint8Array {
  const merged = new Uint8Array(arr1.length + arr2.length);
  merged.set(arr1);
  merged.set(arr2, arr1.length);
  return merged;
}

/**
 * Validates a payload from Discord against its signature and key.
 *
 * @param rawBody - The raw payload data
 * @param signature - The signature from the `X-Signature-Ed25519` header
 * @param timestamp - The timestamp from the `X-Signature-Timestamp` header
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns Whether or not validation was successful
 */
export async function verifyKey(
  rawBody: Uint8Array | ArrayBuffer | Buffer | string,
  signature: string,
  timestamp: string,
  clientPublicKey: string | CryptoKey,
): Promise<boolean> {
  try {
    const timestampData = valueToUint8Array(timestamp);
    const bodyData = valueToUint8Array(rawBody);
    const message = concatUint8Arrays(timestampData, bodyData);
    const publicKey =
      typeof clientPublicKey === "string"
        ? await subtleCrypto.importKey(
            "raw",
            valueToUint8Array(clientPublicKey, "hex"),
            {
              name: "ed25519",
              namedCurve: "ed25519",
            },
            false,
            ["verify"],
          )
        : clientPublicKey;
    const isValid = await subtleCrypto.verify(
      {
        name: "ed25519",
      },
      publicKey,
      valueToUint8Array(signature, "hex"),
      message,
    );
    return isValid;
  } catch (ex) {
    return false;
  }
}

/**
 * Creates a middleware function for use in Express-compatible web servers.
 *
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns The middleware function
 */
export function verifyKeyMiddleware(
  clientPublicKey: string,
): (req: Request, res: Response, next: NextFunction) => void {
  if (!clientPublicKey) {
    throw new Error("You must specify a Discord client public key");
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.header("X-Signature-Timestamp") || "";
    const signature = req.header("X-Signature-Ed25519") || "";

    if (!timestamp || !signature) {
      res.statusCode = 401;
      res.end("[discord-interactions] Invalid signature");
      return;
    }

    async function onBodyComplete(rawBody: Buffer) {
      const isValid = await verifyKey(
        rawBody,
        signature,
        timestamp,
        clientPublicKey,
      );
      if (!isValid) {
        res.statusCode = 401;
        res.end("[discord-interactions] Invalid signature");
        return;
      }

      const body = JSON.parse(rawBody.toString("utf-8")) || {};
      if (body.type === InteractionType.Ping) {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            type: InteractionResponseType.Pong,
          }),
        );
        return;
      }

      req.body = body;
      next();
    }

    if (req.body) {
      if (Buffer.isBuffer(req.body)) {
        await onBodyComplete(req.body);
      } else if (typeof req.body === "string") {
        await onBodyComplete(Buffer.from(req.body, "utf-8"));
      } else {
        console.warn(
          "[discord-interactions]: req.body was tampered with, probably by some other middleware. We recommend disabling middleware for interaction routes so that req.body is a raw buffer.",
        );
        // Attempt to reconstruct the raw buffer. This works but is risky
        // because it depends on JSON.stringify matching the Discord backend's
        // JSON serialization.
        await onBodyComplete(Buffer.from(JSON.stringify(req.body), "utf-8"));
      }
    } else {
      const chunks: Array<Buffer> = [];
      req.on("data", (chunk) => {
        chunks.push(chunk);
      });
      req.on("end", async () => {
        const rawBody = Buffer.concat(chunks);
        await onBodyComplete(rawBody);
      });
    }
  };
}

//! End :(
