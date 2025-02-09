from flask import Flask, Blueprint, request, jsonify
from operate.operate import main_for_api
import os
from flask_cors import CORS

# Create a Blueprint for pages
bp = Blueprint("pages", __name__)

@bp.route("/", methods=["GET"])
def home():
    return "🌟 Welcome to the **Voice Navigator Project**! 🗺️🎤"

@bp.route("/api/operate", methods=["POST"])
def opearte_api():
    """
    API endpoint to execute the self-operating-computer logic.
    """
    try:
        # - Extract JSON data from the request
        data = request.get_json()
        terminal_prompt = data.get("prompt", "")

        # - Check if the terminal prompt is provided
        if not terminal_prompt:
            return  jsonify({"error": "No terminal prompt provided."}), 400
        
        # - Call the main_for_api to execute the logic
        result = main_for_api(
            model="gpt-4",
            terminal_prompt=terminal_prompt,
            voice_mode=False,
            verbose_mode=False,
            image2text= False
        )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error":str(e)}), 500

@bp.route("/api/logs", methods=["GET"])
def read_logs():
    """
    API endpoint to read the self_operating_computer_thought.log file and return its content as a list.
    """
    log_file = "self_operating_computer_thought.log"
    
    # Check if the log file exists
    if not os.path.exists(log_file):
        return jsonify({"error": f"Log file '{log_file}' not found."}), 404
    
    try:
        # Read the log file and return its content as a list
        with open(log_file, "r") as file:
            thoughts = file.readlines()  # Read all lines into a list
            thoughts = [line.strip() for line in thoughts]  # Strip newline characters

        return jsonify(thoughts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


@bp.route("/api/read", methods=["POST"])
def read_api():
    """
    API endpoint to read the screenshot.
    """
    try:
        # - Extract JSON data from the request
        data = request.get_json()
        terminal_prompt = data.get("prompt", "")

        # - Check if the terminal prompt is provided
        if not terminal_prompt:
            return  jsonify({"error": "No terminal prompt provided."}), 400
        
        # - Call the main_for_api to execute the logic
        result = main_for_api(
            model="gpt-4",
            terminal_prompt=terminal_prompt,
            voice_mode=False,
            verbose_mode=False,
            image2text= True
        )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error":str(e)}), 500

def create_app():
    app = Flask(__name__)
    app.register_blueprint(bp)
    # Enable CORS for all routes
    CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins (or specify a list of allowed origins)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000, debug=True)