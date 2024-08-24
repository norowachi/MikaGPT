import express, { Application } from "express";
import {
  verifyKeyMiddleware,
  env,
  getFocusedField,
  runCommandAutoComplete,
  getOptionsValue,
  runCommand,
  getSub,
  cacheCommands,
  IntEmitter,
  Owner,
  Links,
} from "@utils";
import {
  InteractionResponseType,
  InteractionType,
  APIInteraction,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
} from "discord-api-types/v10";

const app: Application = express();

await cacheCommands();

// the interactions endpoint
app.post(
  "/interactions",
  verifyKeyMiddleware(env.DISCORD_APP_PUBLIC_KEY!),
  async (req, res) => {
    let interaction: APIInteraction = req.body;

    // respond to a ping from discord
    if (interaction.type === InteractionType.Ping) {
      return res.json({
        type: InteractionResponseType.Pong,
      });
    }

    // if its an autocomplete interaction
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      // get the focused field
      const focused = getFocusedField(interaction.data.options!);

      // if focused field is not found then ignore
      if (!focused) return;

      // run command's autocomplete
      return await (
        await runCommandAutoComplete(interaction.data.name!)
      )(res, interaction, focused, getOptionsValue(interaction.data?.options));
    }

    // if its a message component or a modal submit emit an interaction with given custom id
    if (
      interaction.type === InteractionType.MessageComponent ||
      interaction.type === InteractionType.ModalSubmit
    ) {
      return IntEmitter.emit(interaction.data.custom_id, res, interaction);
    }

    // if its an application command
    if (
      interaction.type === InteractionType.ApplicationCommand &&
      interaction.data.type === ApplicationCommandType.ChatInput
    ) {
      interaction = interaction as APIChatInputApplicationCommandInteraction;

      // if not one of owners ignore
      if (!Owner.includes((interaction.member || interaction).user!.id))
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `This is a private bot, to host and use your own see ${Links.github}`,
          },
        });

      // run command
      return await (
        await runCommand(interaction.data.name)
      )(
        res,
        interaction,
        getSub(interaction.data?.options?.at(0)),
        getOptionsValue(interaction.data?.options),
      );
    }

    // if no other match then ignore
    return;
  },
);

app.listen(env.PORT, () => {
  console.log(`Started and running on port ${env.PORT}`);
});
