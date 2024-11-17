import "dotenv/config";
import { getRPSChoices } from "./game.js";
import { capitalize, InstallGlobalCommands } from "./utils.js";

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
};

// Command containing options
// const CHALLENGE_COMMAND = {
//   name: "challenge",
//   description: "Challenge to a match of rock paper scissors",
//   options: [
//     {
//       type: 3,
//       name: "object",
//       description: "Pick your object",
//       required: true,
//       choices: createCommandChoices(),
//     },
//   ],
//   type: 1,
// };

// Write command
const WRITE_COMMAND = {
  name: "write",
  description: "Rasmus will write to the best of his abilities",
  type: 1,
};

// About server command
const ABOUT_COMMAND = {
  name: "intro",
  description: "Tell Rasmus a bit about your server",
  type: 1,
  options: [
    {
      type: 3,
      name: "server",
      description: "Overview about the server",
      required: false,
    },
    {
      type: 3,
      name: "channel",
      description: "Overview about this channel",
      required: false,
    },
  ],
};

// Generate image command
const GENERATE_COMMAND = {
  name: "generate",
  description: "Generate an image from a prompt. Command is available until 4th Jan, 2025.",
  type: 1,
  options: [
    {
      type: 3,
      name: "prompt",
      description: "A descriptive prompt of the image",
      required: true,
    }
  ],
};

const ALL_COMMANDS = [WRITE_COMMAND, TEST_COMMAND, ABOUT_COMMAND, GENERATE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
