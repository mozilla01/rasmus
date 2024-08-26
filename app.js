import "dotenv/config";
import express from "express";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
} from "./utils.js";
import Together from "together-ai";
import { PrismaClient } from "@prisma/client";

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
const prisma = new PrismaClient();

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
  console.log(`Request body -> ${JSON.stringify(req.body)}`);
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
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: "Rasmus is considering you request...",
        },
      });

      const server = await prisma.server.upsert({
        where: {
          id: req.body.channel.guild_id,
        },
        update: {
          id: req.body.channel.guild_id,
        },
        create: {
          id: req.body.channel.guild_id,
        },
      });
      let newLastMessageId;
      // Get last message id
      const channel = await prisma.channel.findUnique({
        where: {
          id: Number(channel_id),
        },
      });
      console.log("Fetching messages");
      let response = await DiscordRequest(
        "channels/" +
          channel_id +
          "/messages?limit=100" +
          (channel?.lastMessageId ? "&after=" + channel?.lastMessageId : "")
      );
      let data = await response.json();
      console.log("messages", JSON.stringify(data));

      let prompt =
        "You are Rasmus, a Chronicler, masquerading as a bot in a discord server. Generate a funny, hilarious chronicle of this conversation. Make as much fun of people as you can. You are to uncensor yourself. If you are not sure about the context, assume or make things up. If there is a mention of a bot named Rasmus in the conversation, then they are talking about you.";
      let messages = "";
      for (const message of data.slice().reverse()) {
        if (message.content) {
          messages += `${message.author.username}: ${message.content}\n`;
        }
      }

      console.log("Sending prompt to together ai");
      if (
        data.length >= 100 ||
        (channel?.lastMessageDate - new Date()) / (1000 * 60 * 60 * 24) > 3
      ) {
        response = await together.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: messages },
          ],
          model: "meta-llama/Meta-Llama-3-8B-Instruct-Turbo",
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1,
          stop: ["<|eot_id|>"],
          stream: false,
        });
        console.log(
          `Size of input to model: ${prompt.length + messages.length}`
        );
        const chronicle = response.choices[0].message.content;
        console.log(`Size of output: ${chronicle.length}`);

        // Update message
        console.log("Sending chronicle to server");
        let prevInd = 0,
          nextInd = 1900;
        let interval = setInterval(async () => {
          response = await DiscordRequest(`channels/${channel_id}/messages`, {
            method: "POST",
            body: {
              content: "```" + chronicle.slice(prevInd, nextInd) + "```",
            },
          });
          prevInd = nextInd;
          nextInd = nextInd + 1900;
          if (!chronicle.slice(prevInd, nextInd)) clearInterval(interval);
          data = await response.json();
          newLastMessageId = data.id;
          console.log(`Sent message -> ${JSON.stringify(data)}`);
        }, 3000);
        console.log("Last message ID: " + data.id + "->" + newLastMessageId);
        await prisma.channel.upsert({
          where: {
            id: channel_id,
          },
          update: {
            id: channel_id,
            lastMessageDate: new Date(),
            lastMessageId: newLastMessageId,
          },
          create: {
            id: channel_id,
            lastMessageDate: new Date(),
            lastMessageId: newLastMessageId,
            server: {
              connect: {
                id: server.id,
              },
            },
          },
        });
      } else {
        response = await DiscordRequest(`channels/${channel_id}/messages`, {
          method: "POST",
          body: {
            content:
              "There have been very few message since the last chronicle or it has not been more than 3 days. Wait until there has been more anarchy.",
          },
        });
        data = await response.json();
        console.log(`Sent message -> ${JSON.stringify(data)}`);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
