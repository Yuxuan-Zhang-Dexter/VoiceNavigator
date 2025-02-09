import base64
import os

import easyocr
import ollama
import pkg_resources
from PIL import Image
from ultralytics import YOLO

from operate.config import Config
from operate.utils.screenshot import capture_screen_with_cursor
from operate.utils.style import ANSI_BRIGHT_MAGENTA, ANSI_GREEN, ANSI_RED, ANSI_RESET
from operate.models.image_to_text_prompt import get_image_explanation_prompt

image_to_text_config = Config()

def image_to_text():
    """
    Implements the image-to-text functionality.
    Captures a screenshot, embeds it in the system prompt, and sends it to GPT-4o for explanation.
    """
    try:
        # Step 1: Capture screenshot
        screenshots_dir = "screenshots"
        if not os.path.exists(screenshots_dir):
            os.makedirs(screenshots_dir)
        screenshot_filename = os.path.join(screenshots_dir, "screenshot.png")
        capture_screen_with_cursor(screenshot_filename)
        
        if not os.path.exists(screenshot_filename) or os.path.getsize(screenshot_filename) == 0:
            raise RuntimeError(f"Screenshot was not captured correctly: {screenshot_filename}")

        # Step 2: Encode screenshot in Base64
        with open(screenshot_filename, "rb") as img_file:
            img_base64 = base64.b64encode(img_file.read()).decode("utf-8")

        # Step 3: Generate system prompt
        system_prompt = get_image_explanation_prompt()
        vision_message = {
            "role": "user",
            "content": [
                {"type": "text", "text": system_prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"},
                },
            ],
        }

        # Step 4: Send request to GPT-4o
        client = image_to_text_config.initialize_openai()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[vision_message],
            presence_penalty=1,
            frequency_penalty=1,
        )

        # Step 5: Process response
        content = response.choices[0].message.content
        return {"description": content}  # Wrap in a dictionary for consistency

    except Exception as e:
        print(f"Error in Image-to-Text: {e}")
        return {"error": str(e)}
    
def render_markdown_as_plain_text(description):
    """
    Converts Markdown-formatted text into plain, readable terminal text.

    Parameters:
    - description (str): The raw Markdown-formatted text.

    Returns:
    - str: Plain text formatted for terminal display.
    """
    # Replace Markdown bold markers with plain text styling
    description = description.replace("**", "")  # Remove bold markers
    description = description.replace("\n", "\n  ")  # Indent for readability
    return description