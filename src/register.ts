import { rest, getInteractionCommands } from "@utils";
import { Routes } from "discord-api-types/v10";
import { inspect } from "util";

console.log("Started refreshing application (/) commands.");
const commands = await getInteractionCommands();
await rest
  .req("PUT", Routes.applicationCommands(rest.me.id), { body: commands })
  .then((res: any) => {
    res?.errors
      ? console.error(inspect(res.errors, { depth: Infinity }))
      : console.log(res);
  });
