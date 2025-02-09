import sys
import os
import time
import asyncio
from prompt_toolkit.shortcuts import message_dialog
from prompt_toolkit import prompt
from operate.exceptions import ModelNotRecognizedException
import platform
import uuid
import logging

from operate.models.image_to_text import (image_to_text, render_markdown_as_plain_text)


# from operate.models.prompts import USER_QUESTION, get_system_prompt
from operate.models.prompts import (
    USER_QUESTION,
    get_system_prompt,
)
from operate.config import Config
from operate.utils.style import (
    ANSI_GREEN,
    ANSI_RESET,
    ANSI_YELLOW,
    ANSI_RED,
    ANSI_BRIGHT_MAGENTA,
    ANSI_BLUE,
    style,
)
from operate.utils.operating_system import OperatingSystem
from operate.models.apis import get_next_action

# Load configuration
config = Config()
operating_system = OperatingSystem()

# # Define a global logger variable
# logger = None

# def initialize_logging(log_file=None):
#     """
#     Initializes the logging configuration and sets up the global logger.

#     Parameters:
#     - log_file (str): The name of the log file. If not provided, a default name with a timestamp will be used.

#     Returns:
#     None
#     """
#     global logger  # Declare the global logger variable

#     if log_file is None:
#         # Create a default log file name with a timestamp
#         log_file = f"self_operating_computer_thought.log"
    
#     # Clear up the existing log file
#     if os.path.exists(log_file):
#         os.remove(log_file)

#     # Create and configure a specific logger for your application
#     logger = logging.getLogger("SelfOperatingComputerThought")
#     logger.setLevel(logging.INFO)  # Set logging level for your logger

#     # Prevent logs from propagating to the root logger
#     logger.propagate = False

#     # Set up a file handler for logging to a file
#     file_handler = logging.FileHandler(log_file, mode="w")
#     file_handler.setLevel(logging.INFO)  # Set file handler level
#     file_handler.setFormatter(logging.Formatter("%(message)s"))  # Minimal log format

#     # Add the file handler to your logger
#     logger.addHandler(file_handler)

#     # Suppress verbose logs from external libraries
#     logging.getLogger("urllib3").setLevel(logging.WARNING)
#     logging.getLogger("openai").setLevel(logging.WARNING)

LOG_FILE = "self_operating_computer_thought.log"  # Log file name

def write_to_log(content: str):
    """
    Simplified logging logic: Writes a single line to the log file.

    Parameters:
    - content (str): The line to write to the log file.

    Returns:
    None
    """
    with open(LOG_FILE, "a") as log_file:  # Open in append mode
        log_file.write(content + "\n")  # Write the content followed by a new line


def initialize_logging():
    """
    Clears the log file at the start of the program.

    Returns:
    None
    """
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)  # Delete the file if it exists
    

def main_for_api(model, terminal_prompt=None, voice_mode=False, verbose_mode=False, image2text=False):
    """
    Optimized version of the main function for API use.

    Parameters:
    - model: The model used for generating responses (e.g., "gpt-4").
    - terminal_prompt: The task description provided by the user.
    - voice_mode: Boolean to enable/disable voice mode (default: False).
    - verbose_mode: Boolean to enable/disable verbose mode for debugging (default: False).

    Returns:
    dict: Contains generated operations, session ID, or an error message.
    """
    try:
        # Enable verbose mode if requested
        config.verbose = verbose_mode
        config.validation(model, voice_mode)  # Validate model and config

        # Initialize the logging configuration
        initialize_logging()

        # Validate terminal_prompt
        if not terminal_prompt:
            return {"error": "No terminal prompt provided."}

        # Prepare initial setup
        session_id = str(uuid.uuid4())  # Generate a unique session ID
        objective = terminal_prompt  # Set the user-provided task
        system_prompt = get_system_prompt(model, objective)  # Generate system prompt
        messages = [{"role": "system", "content": system_prompt}]
        loop_count = 0

        # Process operations in a loop
        while loop_count < 10:  # Prevent infinite loops
            if config.verbose:
                print(f"[Self-Operating Computer] Loop count: {loop_count}")

            # Get the next set of actions and update the session ID
            operations, session_id = asyncio.run(
                get_next_action(model, messages, objective, session_id)
            )

            # Execute the operations
            stop = operate(operations, model, image2text)

            if stop:  # Exit loop if the task is complete
                break

            loop_count += 1

        if image2text:
            # Read the image2txt.log file
            log_file = "image2txt.log"
            try:
                with open(log_file, "r", encoding="utf-8") as file:
                    descriptions = file.readlines()  # Read all lines
                    descriptions = [line.strip() for line in descriptions]  # Clean up whitespace
            except FileNotFoundError:
                descriptions = ["No image descriptions available."]

            # Return the response with descriptions and session ID
            return {"descriptions": descriptions, "session_id": session_id}

        # Return successful operations and session ID
        return {"operations": operations, "session_id": session_id}
    
    except Exception as e:
        # Handle and return any errors
        if config.verbose:
            print(f"[Self-Operating Computer][Error] {str(e)}")
        write_to_log(f"error: An unexpected error occurred: {str(e)}")
        return {"error": f"An unexpected error occurred: {str(e)}"}

def main(model, terminal_prompt, voice_mode=False, verbose_mode=False):
    """
    Main function for the Self-Operating Computer.

    Parameters:
    - model: The model used for generating responses.
    - terminal_prompt: A string representing the prompt provided in the terminal.
    - voice_mode: A boolean indicating whether to enable voice mode.

    Returns:
    None
    """

    mic = None
    # Initialize `WhisperMic`, if `voice_mode` is True

    config.verbose = verbose_mode
    config.validation(model, voice_mode)

    if voice_mode:
        try:
            from whisper_mic import WhisperMic

            # Initialize WhisperMic if import is successful
            mic = WhisperMic()
        except ImportError:
            print(
                "Voice mode requires the 'whisper_mic' module. Please install it using 'pip install -r requirements-audio.txt'"
            )
            sys.exit(1)

    # Skip message dialog if prompt was given directly
    if not terminal_prompt:
        message_dialog(
            title="Self-Operating Computer",
            text="An experimental framework to enable multimodal models to operate computers",
            style=style,
        ).run()

    else:
        print("Running direct prompt...")

    # # Clear the console
    if platform.system() == "Windows":
        os.system("cls")
    else:
        print("\033c", end="")

    if terminal_prompt:  # Skip objective prompt if it was given as an argument
        objective = terminal_prompt
    elif voice_mode:
        print(
            f"{ANSI_GREEN}[Self-Operating Computer]{ANSI_RESET} Listening for your command... (speak now)"
        )
        try:
            objective = mic.listen()
        except Exception as e:
            print(f"{ANSI_RED}Error in capturing voice input: {e}{ANSI_RESET}")
            return  # Exit if voice input fails
    else:
        print(
            f"[{ANSI_GREEN}Self-Operating Computer {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]\n{USER_QUESTION}"
        )
        print(f"{ANSI_YELLOW}[User]{ANSI_RESET}")
        objective = prompt(style=style)

    system_prompt = get_system_prompt(model, objective)
    system_message = {"role": "system", "content": system_prompt}
    messages = [system_message]

    loop_count = 0

    session_id = str(uuid.uuid4())

    while True:
        if config.verbose:
            print("[Self Operating Computer] loop_count", loop_count)
        try:
            operations, session_id = asyncio.run(
                get_next_action(model, messages, objective, session_id)
            )

            stop = operate(operations, model)
            if stop:
                break

            loop_count += 1
            if loop_count > 10:
                break
        except ModelNotRecognizedException as e:
            print(
                f"{ANSI_GREEN}[Self-Operating Computer]{ANSI_RED}[Error] -> {e} {ANSI_RESET}"
            )
            break
        except Exception as e:
            print(
                f"{ANSI_GREEN}[Self-Operating Computer]{ANSI_RED}[Error] -> {e} {ANSI_RESET}"
            )
            break


def operate(operations, model, image2text):
    if config.verbose:
        print("[Self Operating Computer][operate]")

    if image2text:
        # Trigger Image-to-Text feature after each operation
        print(f"{ANSI_GREEN}[Self-Operating Computer] Running Image-to-Text Analysis...{ANSI_RESET}")
        try:
            explanation = image_to_text()
            result = render_markdown_as_plain_text(explanation["description"])
            with open("image2txt.log", "w", encoding="utf-8") as file:
                file.write(result + "\n") 
            print(f"{ANSI_BLUE}Image Explanation: {ANSI_RESET}{result}")
            return True
        except Exception as e:
            print(f"{ANSI_RED}Error during Image-to-Text: {e}{ANSI_RESET}")
            return False

    for operation in operations:
        if config.verbose:
            print("[Self Operating Computer][operate] operation", operation)
        # wait one second
        time.sleep(1)
        operate_type = operation.get("operation").lower()
        operate_thought = operation.get("thought")
        operate_detail = ""
        if config.verbose:
            print("[Self Operating Computer][operate] operate_type", operate_type)

        if operate_type == "press" or operate_type == "hotkey":
            keys = operation.get("keys")
            operate_detail = keys
            operating_system.press(keys)
        elif operate_type == "write":
            content = operation.get("content")
            operate_detail = content
            operating_system.write(content)
        elif operate_type == "click":
            x = operation.get("x")
            y = operation.get("y")
            click_detail = {"x": x, "y": y}
            operate_detail = click_detail

            operating_system.mouse(click_detail)
        elif operate_type == "done":
            summary = operation.get("summary")

            print(
                f"[{ANSI_GREEN}Self-Operating Computer {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]"
            )
            print(f"{ANSI_BLUE}Objective Complete: {ANSI_RESET}{summary}\n")
            return True

        else:
            print(
                f"{ANSI_GREEN}[Self-Operating Computer]{ANSI_RED}[Error] unknown operation response :({ANSI_RESET}"
            )
            print(
                f"{ANSI_GREEN}[Self-Operating Computer]{ANSI_RED}[Error] AI response {ANSI_RESET}{operation}"
            )
            return True
        
        # Log the three print statements
        write_to_log(operate_thought)
        print(
            f"[{ANSI_GREEN}Self-Operating Computer {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]"
        )
        print(f"{operate_thought}")
        print(f"{ANSI_BLUE}Action: {ANSI_RESET}{operate_type} {operate_detail}\n")

    return False
