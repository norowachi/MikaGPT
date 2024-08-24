import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import { CommandData, env } from "@utils";
import OpenAI from "openai";

const openai = new OpenAI({});

export default {
  name: "message",
  description: "Propmt the GPT",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "message",
      description: "Yes?",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "hide",
      description: "Hide from others? (default: false)",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ],
  contexts: [0, 1, 2],
  integration_types: [0, 1],
  run: async (res, _int, _sub, options) => {
    // the prompt
    const message = options.getString("message", true);
    const hide = options.getBoolean("hide");

    // the personality
    const personality = "";

    // request
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: env.AI_SYSTEM.replace("{personality}", personality),
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "gpt-4o-mini-2024-07-18",
    });

    // reply
    return res.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content:
          completion.choices[0].message.content ||
          completion.choices[0].message.refusal,
        flags: hide ? MessageFlags.Ephemeral : undefined,
      },
    });
  },
} as CommandData;
