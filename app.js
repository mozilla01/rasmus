import "dotenv/config";
import express from "express";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from "discord-interactions";
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
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
  const { type, channel_id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
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
      // Send a message into the channel where command was triggered from
      //Deferring response
      console.log("Deferring response");
      res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
      let response = await DiscordRequest(
        "channels/" + channel_id + "/messages?limit=100"
      );
      let data = await response.json();

      let prompt =
        "You are Rasmus, a Chronicler. Generate a funny, silly chronicle of this conversation. You are allowed to take silly, humorous jabs or make taunts at people. If you are not sure about the context, you are allowed to assume or make things up. Pretend as though no one is listening. Keep in within 2000 characters.";
      for (const message of data.slice().reverse()) {
        if (message.content) {
          prompt += `\n${message.author.username}: ${message.content}`;
        }
      }
      console.log("The prompt");
      console.log(prompt);

      console.log("The response");
      response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        timeout: 600000,
        body: JSON.stringify({
          model: "llama3",
          prompt: prompt,
          stream: false,
        }),
      });
      data = await response.json();
      console.log(data);

      // return res.send({
      //   type: InteractionResponseType.UPDATE_MESSAGE,
      //   data: {
      //     // content: "```" + data.response + "```",
      //     content: ":(",
      //   },
      // });

      // Update message
      response = await DiscordRequest(`channels/${channel_id}/messages`, {
        method: "POST",
        body: { content: "```" + data.response + "```" },
      });
      data = await response.json();
      console.log(data);
    }
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
