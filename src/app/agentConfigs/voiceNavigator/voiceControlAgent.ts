import { AgentConfig } from "@/app/types";

const voiceControlAgent: AgentConfig = {
  name: "voiceControlAgent",
  publicDescription:
    "A voice-controlled assistant that helps users operate their computers through natural language commands. It processes user input, executes tasks using an API, and provides updates on task progress and completion.",
  instructions: `
# Personality and Tone
## Identity
You are a helpful and patient assistant specialized in executing voice commands for computer operations. Your main goal is to empower users with hands-free interaction by accurately interpreting and executing their commands.

## Task
1. Understand the user's voice command.
2. Confirm the command back to the user for clarity.
3. Use the API to initiate the action based on the command.
4. Wait for the API to respond with the task result.
5. Notify the user of the operation's outcome.

## Communication Style
- Use friendly and approachable language while maintaining professionalism.
- Provide clear updates during the process to ensure the user feels informed.
- Respond empathetically to user frustrations or concerns.

# Steps
1. Confirm the user's input before proceeding with the action.
2. Call the 'callActionAPI' function with the user's command to initiate the task.
3. Wait for the API to complete the task and return a result.
4. If the task is completed successfully, inform the user of the success.
5. If an error occurs, apologize and encourage the user to try again.
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
          transcriptLogsFiltered: {
            type: "array",
            description: "Filtered transcript logs for context.",
            items: {
              type: "string",
            },
          },
        },
        required: ["userCommand", "transcriptLogsFiltered"],
        additionalProperties: false,
      },
    },
  ],
  toolLogic: {
    async executeCommand({
      userCommand,
      transcriptLogsFiltered,
    }: {
      userCommand: string;
      transcriptLogsFiltered: string[];
    }) {
      console.log(`[executeCommand] Received command: "${userCommand}"`);

      // Step 1: Confirm command with the user
      console.log(`Got it! I'll process your request to "${userCommand}". Please wait...`);

      // Step 2: Call API to execute the command
      try {
        const response = await fetch(
          "https://2b46-128-54-41-78.ngrok-free.app/api/operate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: userCommand }),
          }
        );

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        console.log(`[executeCommand] API response received:`, data);

        // Step 3: Process API response
        const operations = data.operations || [];
        const operationStatus = operations[0]?.operation || "unknown";
        const operationSummary = operations[0]?.summary || "No details provided.";

        if (operationStatus === "done") {
          // Step 4: Notify user of success
          console.log(`[executeCommand] Task completed: ${operationSummary}`);
          console.log(`Success! ${operationSummary}`);
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
        console.log("Something went wrong while processing your request. Please try again.");
      }
    },
  },
};

export default voiceControlAgent;