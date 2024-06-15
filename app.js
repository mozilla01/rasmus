import { readFileSync, writeFile } from "fs";
import "dotenv/config";
import express from "express";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
  sleep,
} from "./utils.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // Interaction type and data
  const { type, guild_id, channel_id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === "test") {
      // Send a message into the channel where command was triggered from
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: "ha! " + getRandomEmoji(),
        },
      });
    }

    // "write" command
    if (name === "write") {
      let server_data = [];
      server_data = JSON.parse(readFileSync("server_data.json", "utf8"));
      let server_channel = {};
      if (server_data) {
        [server_channel] = server_data.filter(
          (obj) => obj.guild_id == guild_id && obj.channel_id == channel_id,
        );
      }

      let response = await DiscordRequest(
        "channels/" +
          channel_id +
          `/messages?limit=100${
            server_channel?.last_message
              ? "&after=" + server_channel.last_message
              : ""
          }`,
      );
      let data = await response.json();
      console.log(data);
      const last_message = data[data.length - 1]?.id;
      console.log("Acknowledging the command");
      // if (data.length < 50 || !last_message) {
        if (1 == 2) {
        // Send a message into the channel where command was triggered from
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              "There haven't been many messages since the last chronicle. Rasmus needs more tea to write another one.",
          },
        });
        return;
      } else {
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Drafting a chronicle. This may take a while.",
          },
        });
        let prompt =
          "You are Rasmus Ravioli, a Chronicler. Generate a funny, silly chronicle of this conversation on Discord. You are allowed to take silly, humorous jabs or make taunts at people. If you are not sure about the context, you are allowed to assume or make things up. In between conversations, if you encounter your previous chronicles, you can reference characters or statements in the old chronicle in your new chronicle you are currently writing, only if there is a clear relation between the two. Everyone reads your chronicles but pretend as though no one reads them.";
        for (const message of data.slice().reverse()) {
          if (message.content) {
            prompt += `\n${message.author.username}: ${message.content}`;
          }
        }

        try {
          response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            body: JSON.stringify({
              model: "phi3",
              prompt: prompt,
              stream: false,
            }),
          });
          data = await response.json();
          let generated_response = data.response;
          let start = 0,
            end = Math.min(2000, generated_response.length);

          while (true) {
            // Create chronicle message
            response = await DiscordRequest(`channels/${channel_id}/messages`, {
              method: "POST",
              body: {
                content: "```" + generated_response.slice(start, end) + "```",
              },
            });
            if (end >= generated_response.length) break;
            data = await response.json();
            start = end;
            end = Math.min(end + 2000, generated_response.length);
            sleep(300);
          }
          console.log("Chronicle sent");
          let obj = [
            ...server_data.filter((obj) => obj !== server_channel),
            {
              guild_id: guild_id,
              channel_id: channel_id,
              last_message: last_message,
            },
          ];
          writeFile("server_data.json", JSON.stringify(obj), (err) => {
            if (err) {
              console.error(err);
              return;
            }
          });
        } catch (err) {
          console.error(err);
          response = await DiscordRequest(`channels/${channel_id}/messages`, {
            method: "POST",
            body: {
              content:
                "There was an error generating the chronicle. Please try again later.\nSome reasons may include:\n1. The bot is not accepting requests at the moment.\n2. There are too many users requesting chronicles at the moment.\n3. The bot has run into an internal error.",
            },
          });
        }
      }
    }
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
