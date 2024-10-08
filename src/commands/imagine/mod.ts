import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  Routes,
} from "discord-api-types/v10";
import { CommandData, rest } from "@utils";
import OpenAI from "openai";

const openai = new OpenAI({});

export default {
  name: "imagine",
  description: "Generate an image",
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

    // request
    const generation = await openai.images
      .generate({
        prompt: prompt,
        model: "dall-e-2",
        n: 1,
        quality: "standard",
        size: "1024x1024",
      })
      .catch((e) => {
        console.error(e);
      });

    // reply
    return rest.req("PATCH", Routes.webhookMessage(rest.me.id, int.token), {
      body: {
        content: generation
          ? `[${generation.data[0].revised_prompt || prompt}]${generation.data[0].url}`
          : "Failed to generate image",
      },
    });
  },
} as CommandData;
