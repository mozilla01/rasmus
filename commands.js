import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
};

// Write command
const WRITE_COMMAND = {
  name: "write",
  description: "Rasmus will write to the best of his abilities",
  type: 1,
};

const ALL_COMMANDS = [WRITE_COMMAND, TEST_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
