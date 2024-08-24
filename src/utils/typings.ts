import {
  APIApplicationCommandAutocompleteInteraction,
  APIInteraction,
  InteractionResponseType,
  MessageFlags,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Response } from "express";
import { EventEmitter } from "events";

/**
 * Custom emitter to handle (component?) interaction events
 */
export class CustomIntEmitter extends EventEmitter {
  emit(event: string, res: Response, int: APIInteraction): boolean {
    // remove listener after 30mins
    setTimeout(
      () => {
        if (!event) return;
        super.removeAllListeners(event);
      },
      30 * 60 * 1000,
    );

    // Call the original emit method to emit the event
    const result = super.emit(event, res, int);
    // check if response had no listeners then send
    if (!result && res.writable) {
      res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "This interaction is not supported yet.",
          flags: MessageFlags.Ephemeral,
        },
      });
      return false;
    }
    return result;
  }
}

export class OptionsMap extends Map<string, string | number | boolean> {
  /**
   * option type | getting resolved value
   * --- | --- |
   * **{user}** | use `int.data.resolved.users[id]` to get user object
   * **{channel}** | use `int.data.resolved.channels[id]` to get channel object
   * **{role}** | use `int.data.resolved.roles[id]` to get role object
   * **{mentionable}** | use `int.data.resolved.(users\|members)[id]` to get user/member object
   */
  public getString<T extends boolean>(
    key: string,
    required?: T,
  ): T extends true ? string : string | undefined {
    const value = super.get(key);
    return (required ? (value ?? "") : value) as any;
  }

  public getNumber<T extends boolean>(
    key: string,
    required?: T,
  ): T extends true ? number : number | undefined {
    const value = super.get(key);
    return (required ? (value ?? 0) : value) as any;
  }

  public getBoolean<T extends boolean>(
    key: string,
    required?: T,
  ): T extends true ? boolean : boolean | undefined {
    const value = super.get(key);
    return (required ? (value ?? false) : value) as any;
  }
}

/**
 * ### Command Data Interface
 * The data required to create a command.
 *
 * @param name - The name of the command.
 * @param description - The description of the command.
 * @param options - The options of the command.
 * @param contexts - The contexts the command can be used in.
 * @param integration_types - The integration types the command can be used in.
 * @param run - The function to run when the command is called.
 * @param autocomplete - The function to run when the command is autocompleted.
 */
export interface CommandData
  extends Omit<
    RESTPostAPIApplicationCommandsJSONBody,
    "id" | "application_id"
  > {
  /**
   * | NAME | TYPE | DESCRIPTION
   * | --- | --- | --- |
   * | `GUILD` | 0 | Interaction can be used within servers
   * | `BOT_DM` | 1 | Interaction can be used within DMs with the app's bot user
   * | `PRIVATE_CHANNEL` | 2 | Interaction can be used within Group DMs and DMs other than the app's bot user
   */
  contexts: number[];
  /**
   *
   * | TYPE | ID | DESCRIPTION
   * | --- | --- | --- |
   * | `GUILD_INSTALL` | 0 |App is installable to servers
   * | `USER_INSTALL` | 1 | App is installable to users
   */
  integration_types: number[];
  /**
   * The function to run when a command is called.
   *
   * @param res Response object
   * @param interaction Interaction object (can also be accessed thru `res.req.body`)
   * @param sub subcommand group and subcommand if any in [subcommand group, subcommand] or [subcommand] way
   * @param options options object filteredas a Record of key option name
   * @returns
   */
  run: (
    res: Response,
    interaction: APIInteraction,
    sub: string[],
    options: OptionsMap,
  ) => any;
  /**
   *	The function to run when an autocompleted is emitted.
   *
   * @param res Response object
   * @param interaction Interaction object
   * @param focused The focused field
   * @param options options object filtered as a Record of key option name
   * @returns
   */
  autocomplete?: (
    res: Response,
    interaction: APIApplicationCommandAutocompleteInteraction,
    focused: string,
    options?: OptionsMap,
  ) => any;
}

/**
 * converts a type to <undefined | null | "type">
 */
export type UN<Type> = undefined | null | Type;
