import "dotenv/config";
import express from "express";
import {
	InteractionType,
	InteractionResponseType,
} from "discord-interactions";
import {
	VerifyDiscordRequest,
	getRandomEmoji,
	DiscordRequest,
} from "./utils.js";
import Together from "together-ai";

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });



// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function(req, res) {
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
			res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					// Fetches a random emoji to send from a helper function
					content: "Rasmus is drafting a chronicle, it should reach you in a minute...",
				},
			});
			console.log('Fetching messages');
			let response = await DiscordRequest(
				"channels/" + channel_id + "/messages?limit=100"
			);
			let data = await response.json();

			let prompt =
				"You are Rasmus, a Chronicler. Generate a funny, silly chronicle of this conversation. You are allowed to take silly, humorous jabs or make taunts at people. If you are not sure about the context, you are allowed to assume or make things up. Pretend as though no one is listening. Keep in within 2000 characters.";
			let messages = '';
			for (const message of data.slice().reverse()) {
				if (message.content) {
					messages += `${message.author.username}: ${message.content}\n`;
				}
			}

			console.log('Sending prompt to together ai');
			response = await together.chat.completions.create({
				messages: [{ "role": "system", "content": prompt }, { "role": "user", "content": messages }],
				model: "meta-llama/Meta-Llama-3-8B-Instruct-Lite",
				max_tokens: 2000,
				temperature: 0.7,
				top_p: 0.7,
				top_k: 50,
				repetition_penalty: 1,
				stop: ["<|eot_id|>"],
				stream: false
			});
			const chronicle = response.choices[0].message.content;


			// Update message
			console.log('Sending chronicle to server');
			response = await DiscordRequest(`channels/${channel_id}/messages`, {
				method: "POST",
				body: { content: "```" + chronicle + "```" },
			});
		}
	}
});

app.listen(PORT, () => {
	console.log("Listening on port", PORT);
});
