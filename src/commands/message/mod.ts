import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  Routes,
} from "discord-api-types/v10";
import { CommandData, env, rest } from "@utils";
import OpenAI from "openai";

const openai = new OpenAI({});

export default {
  name: "message",
  description: "Prompt the GPT",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "prompt",
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
  run: async (res, int, _sub, options) => {
    // the prompt
    const prompt = options.getString("prompt", true);
    const hide = options.getBoolean("hide");

    // ack
    res.json({
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: {
        flags: hide ? MessageFlags.Ephemeral : undefined,
      },
    });

    // TODO: the personality
    const personality = "";

    // request
    const completion = await openai.chat.completions
      .create({
        messages: [
          {
            role: "system",
            content: env.AI_SYSTEM.replace("{personality}", personality),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "gpt-4o-mini-2024-07-18",
      })
      .catch((e) => {
        console.error(e);
      });

    // reply
    return rest.req("PATCH", Routes.webhookMessage(rest.me.id, int.token), {
      body: {
        content: completion
          ? completion.choices[0].message.content ||
            completion.choices[0].message.refusal
          : "No response...",
      },
    });
  },
} as CommandData;
