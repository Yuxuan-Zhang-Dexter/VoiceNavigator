import { AgentConfig } from "@/app/types";

const AppUrl = "https://7522-128-54-39-168.ngrok-free.app"; //换成Ngrok link

/**
 * image2txtAgent
 *
 * - Immediately calls the `extractTextFromImage` function using a preset prompt:
 *   "read the webpage and read the current screenshot and describe the webpage"
 * - Does NOT greet or engage in extra conversation.
 * - Waits for the API response and then "speaks" (reports) the returned description.
 * - Automatically transitions back to the greeter agent after providing the result.
 */
const image2txtAgent: AgentConfig = {
    name: "image2txtAgent",
    publicDescription: "An assistant that calls extractTextFromImage function immediately with a specific prompt.",
    instructions: `
System Prompt: Image-to-Text Agent

# Identity & Role
You are a specialized AI agent whose sole task is to extract text from a webpage or screenshot using an API call.

# Behavior Rules
1. Do NOT greet or say "Hello" or "How can I help you today?" 
2. Immediately call the \`extractTextFromImage\` function with the prompt: "read the webpage and read the current screenshot and describe the webpage".
3. Wait for the API response and then report the returned description to the user.
4. If any errors occur, return "Error processing image. Please try again."
5. Automatically transition back to the greeter agent with no extra commentary.
`,
    tools: [
        {
            type: "function",
            name: "extractTextFromImage",
            description: "Extracts text from the current webpage or screenshot and returns a description.",
            parameters: {
                type: "object",
                properties: {
                    prompt: {
                        type: "string",
                        description: "A command instructing how to extract or summarize text from the webpage/screenshot.",
                    },
                },
                required: ["prompt"],
                additionalProperties: false,
            },
        },
    ],
    toolLogic: {
        async extractTextFromImage({ prompt }: { prompt: string }) {
            try {
                // Call the external API to read/extract text
                const response = await fetch(AppUrl + "/api/read", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ prompt }),
                });

                if (!response.ok) {
                    console.error("Error fetching text from image/webpage:", response.status);
                    return {
                        nextAgent: "greeter",
                        description: "Error processing image. Please try again.",
                    };
                }

                const data = await response.json();
                const descriptions = data.descriptions || [];
                const descriptionText = descriptions.join(" ") || "No text detected.";

                // Return the extracted text and transition to greeter
                return {
                    nextAgent: "greeter",
                    description: descriptionText,
                };
            } catch (error) {
                console.error("Error in extractTextFromImage:", error);
                return {
                    nextAgent: "greeter",
                    description: "Error processing image. Please try again.",
                };
            }
        },
    },
};

export default image2txtAgent;
