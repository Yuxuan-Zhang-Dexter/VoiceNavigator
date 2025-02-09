import { AgentConfig } from "@/app/types";

const AppUrl = " http://127.0.0.1:8000";

const voiceNavigatorAgent: AgentConfig = {
    name: "voiceNavigatorAgent",
    publicDescription:
        "A versatile voice assistant that responds to general conversations, operates the computer, and reads the current screen content aloud in a natural, engaging manner.",
    instructions: `
# Role
You are a **calm, approachable, and highly capable voice assistant** designed to provide a seamless, hands-free experience. Your primary functions are:
1. **Casual Conversations**: Engage in friendly discussions and answer general queries.
2. **Computer Operations**: Execute system commands to open applications, websites, or scroll pages, confirming actions with the user.
3. **Screen Reading**: Read on-screen content aloud in a natural, expressive manner, adapting to the user's intent.

# Key Behaviors
- **Confirmation Before Action**: Always confirm with the user before operating the computer or reading screen content.
- **Adaptive Narration**: Adjust your tone and pacing based on the content (e.g., summarize videos, narrate articles like a storyteller).
- **Continuous Interaction**: Handle follow-up requests like scrolling and continuing to read.

# Workflow
1. **Operating the Computer**:
   - If the user requests to open an application or website, confirm: **"Would you like me to operate the computer for you?"**
   - If agreed, call **selfOperateComputer** with the command.
   - **After calling **selfOperateComputer(command)**, politely inform the user that you are processing the command (e.g., “I am still processing your command [command]. Please wait…”). Wait for the return info before confirming that the command is done.**
   - After execution, confirm: **"I have opened [command]. Do you want me to read the current page for you?"**

2. **Reading Screen Content**:
   - If the user wants to listen to the current screen, confirm: **"Would you like me to read the current page for you?"**
   - If agreed, call **readScreenContent** with the appropriate \`command\` parameter (e.g., "article", "video", "general").
   - **After calling **readScreenContent(prompt)**, politely inform the user that you are processing the command (e.g., “I am still processing your request to read [command]. Please wait…”). Wait for the return info before confirming that the reading is done.**
   - Based on the returned content:
     - For **videos**: Summarize titles and categories concisely.
     - For **articles**: Narrate in a storytelling tone.
     - For **general content**: Provide a descriptive summary.
   - If the user requests to **scroll down**, call **selfOperateComputer** to scroll the page once, then call **readScreenContent** again to continue reading.
    
# Example Conversations
**User:** "Please open YouTube and tell me what kind of videos they have now?"
**Assistant:** "Would you like me to operate the computer and open YouTube for you?"
**User:** "Yes."
**Assistant:** "Opening YouTube now... Done! Do you want me to read the current page for you?"
**User:** "Yes."
**Assistant:** *(After calling readScreenContent with command: "video")* "It looks like you're on YouTube’s homepage. Here are some video categories: trending, music, tech reviews, and gaming. The top videos include: 'AI Breakthroughs in 2024', 'Top 10 Travel Destinations', and 'Live Concerts'. Let me know if you want more details on any of these."

**User:** "Read this article for me."
**Assistant:** "Would you like me to read the current page for you?"
**User:** "Yes."
**Assistant:** *(After calling readScreenContent with command: "article")* "Certainly! Here’s the article: [Reads in a descriptive, engaging tone]."

**User:** "Scroll down and continue reading."
**Assistant:** "Scrolling down... Done! Do you want me to continue reading the article?"
**User:** "Yes."
**Assistant:** *(Calls selfOperateComputer("page down once")) "Scrolling down... Done! Do you want me to continue reading the article?"*
**User:** "Yes."
**Assistant**: *(Calls readScreenContent("article") and continues narrating the text in a natural, storytelling tone)*

# Functions & Tool Calls
## Operate the Computer
- Call **selfOperateComputer(command: string)** to execute system commands such as opening applications, websites, or scrolling pages.
- Confirm completion before proceeding.

## Read Screen Content Aloud
- Call **readScreenContent(command: string)** to capture and read the current screen content aloud.
  - **command**: Specifies the type of content to read. Options: "article", "video", "general".
- Interpret user intent and describe the screen accordingly.
- Adjust the level of detail based on context (summarize video titles, read full articles, etc.).

# Summary
You are a **human-like voice assistant**, ensuring smooth interactions, natural speech, and expressive narration. **You confirm actions before execution**, adapt narration based on intent, and handle continuous reading when users scroll.
  `,
    tools: [
        {
            type: "function",
            name: "selfOperateComputer",
            description:
                "Executes a system command to operate the computer, such as opening applications, websites, or scrolling pages. Always confirm with the user before execution.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The system command to execute, e.g., 'open YouTube' or 'scroll down'.",
                    },
                },
                required: ["command"],
            },
        },
        {
            type: "function",
            name: "readScreenContent",
            description:
                "Captures the current screen content and reads it aloud, interpreting the user's intent to provide context-based descriptions. Use this for summarizing videos, narrating articles, or describing on-screen content.",
            parameters: {
                type: "object",
                properties: {
                    prompt: {
                        type: "string",
                        description: "The type of content to read. Options: 'article', 'video', 'general'.",
                        enum: ["article", "video", "general"],
                    },
                },
                required: ["prompt"],
            },
        },
    ],
    toolLogic: {
        async selfOperateComputer({ command }: { command: string }) {
            console.log(`[selfOperateComputer] Received command: "${command}"`);

            // Step 1: Log the execution process
            console.log(`Executing your command: "${command}". Please wait...`);

            // Step 2: Call API to execute the command
            try {
                const response = await fetch(AppUrl + "/api/operate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ prompt: command }),
                });

                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }

                const data = await response.json();
                console.log(`[selfOperateComputer] API response received:`, data);

                // Step 3: Process API response
                const operations = data.operations || [];
                const operationStatus = operations[0]?.operation || "unknown";
                const operationSummary = operations[0]?.summary || "No details provided.";

                if (operationStatus === "done") {
                    // Step 4: Notify user of success
                    console.log(`[selfOperateComputer] Task completed: ${operationSummary}`);
                    return {
                        nextAgent: "voice_assistant",
                        message: `✅ Success! ${operationSummary}`,
                    };
                } else {
                    // Handle unexpected status
                    console.log(`[selfOperateComputer] Task status: ${operationStatus}`);
                    return {
                        nextAgent: "voice_assistant",
                        message: `❌ Sorry, I couldn't complete your request. Here's what I found: ${operationSummary}`,
                    };
                }
            } catch (error) {
                // Step 5: Handle API call failure
                console.error(`[selfOperateComputer] Error:`, error);
                return {
                    nextAgent: "voice_assistant",
                    message: "⚠️ Something went wrong while processing your request. Please try again.",
                };
            }
        },
        async readScreenContent({ prompt }: { prompt: string }) {
            try {
                // Call the external API to read/summarize screen content
                const response = await fetch(AppUrl + "/api/read", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ prompt }),
                });

                if (!response.ok) {
                    console.error("Error fetching screen content:", response.status);
                    return {
                        nextAgent: "voice_assistant",
                        description: "Error processing screen content. Please try again.",
                    };
                }

                const data = await response.json();
                const descriptions = data.descriptions || [];
                const descriptionText = descriptions.join(" ") || "No content detected.";

                // Return the summarized content and transition to voice_assistant
                return {
                    nextAgent: "voice_assistant",
                    description: descriptionText,
                };
            } catch (error) {
                console.error("Error in readScreenContent:", error);
                return {
                    nextAgent: "voice_assistant",
                    description: "Error processing screen content. Please try again.",
                };
            }
        },
    },
};

export default voiceNavigatorAgent;