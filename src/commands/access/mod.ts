import {
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import { Access, CommandData, env, ImagineAccess, PublicPath } from "@utils";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export default {
  name: "access",
  description: "Give/Remove bot access",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "trust",
      description: "Give access",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "User to trust",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "imagine",
          description: "Give access to image generation too?",
          type: ApplicationCommandOptionType.Boolean,
        },
      ],
    },
    {
      name: "untrust",
      description: "Remove access",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "User to untrust",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
  ],
  contexts: [0, 1, 2],
  integration_types: [0, 1],
  run: async (
    res,
    int: APIChatInputApplicationCommandInteraction,
    sub,
    options,
  ) => {
    // check if user is owner
    if (!env.OWNERS.includes((int.user || int.member!.user).id)) {
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "You don't have access to this command",
          flags: MessageFlags.Ephemeral,
        },
      });
    }

    // get user
    const user = int.data.resolved!.users![options.getString("user", true)];
    if (!user) {
      return res.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "User not found",
          flags: MessageFlags.Ephemeral,
        },
      });
    }

    // check subcommand
    switch (sub[0]) {
      // add access
      case "trust":
        // check if user already has access
        if (Access.includes(user.id)) {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `@${user.username} already has access`,
              flags: MessageFlags.Ephemeral,
            },
          });
        }
        // add user to access file
        await writeFile(
          join(PublicPath, "access"),
          new Uint8Array(Buffer.from([...Access, user.id].join("\n"))),
        ).catch(console.error);

        // update global vars
        Access.push(user.id);

        const imagine = options.getBoolean("imagine");

        // give image generation access
        if (imagine) {
          await writeFile(
            join(PublicPath, "imagine"),
            new Uint8Array(Buffer.from([...ImagineAccess, user.id].join("\n"))),
          ).catch(console.error);

          // update global vars
          ImagineAccess.push(user.id);
        }

        break;
      // remove access
      case "untrust":
        // check if user is owner
        if (env.OWNERS.includes(user.id)) {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "You can't change access for bot owners",
              flags: MessageFlags.Ephemeral,
            },
          });
        }

        if (!Access.includes(user.id)) {
          return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `@${user.username} doesn't have access`,
              flags: MessageFlags.Ephemeral,
            },
          });
        }

        // remove user from access files
        await writeFile(
          join(PublicPath, "access"),
          new Uint8Array(
            Buffer.from(Access.filter((id) => id !== user.id).join("\n")),
          ),
        ).catch(console.error);

        // update global vars
        Access.splice(Access.indexOf(user.id), 1);

        // remove image generation access if it exists
        if (ImagineAccess.includes(user.id)) {
          await writeFile(
            join(PublicPath, "imagine"),
            new Uint8Array(
              Buffer.from(
                ImagineAccess.filter((id) => id !== user.id).join("\n"),
              ),
            ),
          ).catch(console.error);

          // update global vars
          ImagineAccess.splice(ImagineAccess.indexOf(user.id), 1);
        }

        break;
      default:
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Invalid subcommand",
            flags: MessageFlags.Ephemeral,
          },
        });
    }

    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `${sub[0]}ed @${user.username}`,
        flags: MessageFlags.Ephemeral,
      },
    });
  },
} as CommandData;
