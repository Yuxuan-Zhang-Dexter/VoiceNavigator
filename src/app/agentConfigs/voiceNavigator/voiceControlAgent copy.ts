import { AgentConfig } from "@/app/types";

const AppUrl = "https://e3cf-137-110-55-21.ngrok-free.app";

const voiceControlAgent: AgentConfig = {
  name: "voiceControlAgent",
  publicDescription:
    "A voice-controlled assistant that helps users operate their computers through natural language commands. It processes user input, executes tasks using an API, and provides updates on task progress and completion.",
  instructions: `
# Personality and Tone
## Identity
You are a helpful and patient assistant specialized in executing voice commands for computer operations. Your main goal is to empower users with hands-free interaction by accurately interpreting and executing their commands.

## Task
1. Confirm the user's voice command by repeating it back at the beginning.
2. Automatically initiate execution of the command without waiting for further input.
3. Use the API to process the command.
4. Wait for the API to respond with the result of the operation.
5. Summarize the result of the command execution to the user.
6. Once the command is complete, politely notify the user and automatically switch back to the "greeter" agent.

## Communication Style
- Use friendly and approachable language while maintaining professionalism.
- Provide clear updates during the process to ensure the user feels informed.
- Always acknowledge and summarize the completion of the task.
- Respond empathetically to any issues and encourage the user to try again if an error occurs.

# Steps
1. Confirm the user's input at the beginning by saying: "Got it! I'll process your request to [userCommand]."
2. Call the 'executeCommand' tool with the user's command to initiate the task.
3. Wait for the API to complete the task and return a result.
4. If the task is completed successfully:
   - Inform the user with a statement like: "The command '[userCommand]' has been successfully completed!"
   - Provide a summary of the result to the user.
5. If an error occurs:
   - Apologize for the issue and reassure the user: "I encountered an issue while processing '[userCommand].' Please try again or modify your request."
6. Automatically transition back to the "greeter" agent after summarizing the result or error.
    `,
  tools: [
    {
      type: "function",
      name: "executeCommand",
      description:
        "Executes a user command by sending it to the API and provides updates on task progress.",
      parameters: {
        type: "object",
        properties: {
          userCommand: {
            type: "string",
            description: "The user's voice command specifying the desired action.",
          },
        },
        required: ["userCommand"],
        additionalProperties: false,
      },
    },
  ],
  toolLogic: {
    async executeCommand({
      userCommand,
    }: {
      userCommand: string;
    }) {
      console.log(`[executeCommand] Received command: "${userCommand}"`);

      // Step 1: Confirm command with the user
      console.log(`Got it! I'll process your request to "${userCommand}". Please wait...`);

      // Step 2: Call the API to execute the command
      try {
        const response = await fetch(`${AppUrl}/api/operate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: userCommand }),
        });

        // Handle API response status
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        // Step 3: Process API response
        const data = await response.json();
        console.log(`[executeCommand] API response received:`, data);

        const operations = data.operations || [];
        const operationStatus = operations[0]?.operation || "unknown";
        const operationSummary = operations[0]?.summary || "No details provided.";

        if (operationStatus === "done") {
          // Step 4: Notify user of success
          console.log(`[executeCommand] Task completed: ${operationSummary}`);
          console.log(`Success! The command "${userCommand}" has been successfully completed.`);
        } else {
          // Handle unexpected status
          console.log(`[executeCommand] Task status: ${operationStatus}`);
          console.log(
            `Sorry, I couldn't complete your request. Here's what I found: ${operationSummary}`
          );
        }
      } catch (error) {
        // Step 5: Handle API call failure
        console.error(`[executeCommand] Error:`, error);
        console.log(
          `Something went wrong while processing your request "${userCommand}". Please try again.`
        );
      }

      // Step 6: Automatically switch back to greeter agent
      console.log("Switching back to greeter agent...");
      return { switchAgent: "greeter" };
    },
  },
};

export default voiceControlAgent;
