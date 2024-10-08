import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  Routes,
} from "discord-api-types/v10";
import { CommandData, env, rest } from "@utils";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export default {
  name: "gemini",
  description: "Chat with the Google Gemini AI!",
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

    // model & sys prompt
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: env.AI_SYSTEM,
    });

    // result
    const result = await model.generateContent(prompt).catch((e) => {
      console.error(e);
    });

    // reply
    return rest.req("PATCH", Routes.webhookMessage(rest.me.id, int.token), {
      body: {
        content: result ? result.response.text() : "An error occurred!",
      },
    });
  },
} as CommandData;
