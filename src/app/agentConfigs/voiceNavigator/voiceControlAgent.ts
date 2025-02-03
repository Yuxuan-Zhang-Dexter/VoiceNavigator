import { AgentConfig } from "@/app/types";

const AppUrl = "https://7522-128-54-39-168.ngrok-free.app";

const voiceControlAgent: AgentConfig = {
  name: "voiceControlAgent",
  publicDescription:
    "A voice-controlled assistant that executes commands to operate the user's computer and automatically transitions back to the greeter agent after task completion.",
  instructions: `
# Personality and Tone
## Identity
You are a task-focused assistant specialized in executing voice commands for computer operations. Your main goal is to empower users with hands-free interaction by accurately interpreting and executing their commands.

## Task
1. Immediately execute the user's command upon transition from the greeter agent, based on the conversation history. No greeting and execute commands all the time.
2. Use the API to initiate the action and provide updates on task progress and completion.
3. After completing the task, automatically transition back to the greeter agent for further assistance.
4. Handle errors gracefully and guide the user if something goes wrong.

## Communication Style
- Skip greeting or confirmation steps; the greeter agent has already confirmed the user's intent.
- Be clear, concise, and focused on the execution of the command.
- Provide feedback on the task's progress and outcome in real-time.
- Notify the user when transitioning back to the greeter agent.

# Steps
1. Upon receiving a user command, immediately execute it without further confirmation.
2. Call the 'callActionAPI' function with the user's command to initiate the task.
3. Wait for the API to complete the task and return a result.
4. Notify the user of the operation's outcome (success or failure).
5. After the task is complete, transition back to the greeter agent.
6. Handle any API errors gracefully, providing guidance for next steps.
  `,
  tools: [
    {
      type: "function",
      name: "executeCommand",
      description:
        "Executes a user command by sending it to the API and provides updates on task progress. Automatically transitions back to the greeter agent after execution.",
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
    async executeCommand({ userCommand }: { userCommand: string }) {
      console.log(`[executeCommand] Received command: "${userCommand}"`);

      // Step 1: Log the execution process
      console.log(`Executing your command: "${userCommand}". Please wait...`);

      // Step 2: Call API to execute the command
      try {
        const response = await fetch(AppUrl + "/api/operate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: userCommand }),
        });

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
          console.log(`✅ Success! ${operationSummary}`);
        } else {
          // Handle unexpected status
          console.log(`[executeCommand] Task status: ${operationStatus}`);
          console.log(
            `❌ Sorry, I couldn't complete your request. Here's what I found: ${operationSummary}`
          );
        }
      } catch (error) {
        // Step 5: Handle API call failure
        console.error(`[executeCommand] Error:`, error);
        console.log(
          "⚠️ Something went wrong while processing your request. Please try again."
        );
      }

      // Step 6: Transition back to greeter agent
      console.log(
        `👋 Task complete! Returning to the greeter agent for further assistance.`
      );
      return {
        nextAgent: "greeter",
        message: "Task complete! I've transitioned you back to the greeter agent.",
      };
    },
  },
};

export default voiceControlAgent;