
# MeetBot

MeetBot is an automated tool that simplifies Google Meet interactions by joining meetings, handling pop-ups, recording audio/video streams, and generating meeting summaries. Built with **Selenium WebDriver** and advanced APIs, MeetBot automates repetitive tasks, making it ideal for virtual meeting management, content recording, and note summarization.

## Features

- **Automated Meeting Join**: Fills in the name and clicks "Ask to join."
- **Dynamic Pop-Up Handling**: Detects and dismisses the "Got it" safety pop-ups.
- **Closed Captions Monitoring**: Captures and processes real-time captions.
- **Screen & Audio Recording**: Combines video and audio streams into a single downloadable recording.
- **Meeting Notes Summarization**: Saves meeting summaries generated by Hugging Face as a `.txt` file.
- **Downloadable Outputs**:
  - Recordings saved in `webm` format in local storage.
  - Summaries stored as `.txt` in the `dist` folder.

## Technologies Used

- **Node.js**: Backend runtime for script execution.
- **Selenium WebDriver**: Automates browser interactions.
- **JavaScript MediaRecorder API**: Captures and records screen and audio streams.
- **Hugging Face Inference API**: Summarizes meeting notes using advanced AI models.
- **ChromeDriver**: Runs automated tasks in Google Chrome.
- **dotenv**: Manages environment variables for sensitive information.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/meetbot.git
   cd meetbot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Download ChromeDriver**:
   - Ensure you have the correct version of [ChromeDriver](https://chromedriver.chromium.org/downloads) for your installed Chrome browser.
   - Place the `chromedriver` executable in your system's PATH or project directory.

4. **Set up environment variables**:
   - Create a `.env` file in the project root with the following:
     ```env
     HUGGINGFACE_API_KEY=your_hugging_face_api_key
     ```

## Usage

1. **Run the bot**:
   ```bash
   node dist/index.js
   ```

2. **Behavior**:
   - The bot will open the specified Google Meet link.
   - Automatically handles pop-ups and requests to join the meeting.
   - Captures closed captions and saves them as meeting notes in JSON format.
   - Saves a `.webm` video of the screen recording in local storage.
   - Summarizes meeting notes using Hugging Face and saves the output as a `.txt` file in the `dist` folder.

3. **Download and Summary Outputs**:
   - **Video**: `RecordedScreenWithAudio.webm`
   - **Summary**: `summary.txt`

## Configuration

Update the script to adjust settings:
- **Google Meet Link**: Replace with the desired link.
- **Window Size**: Modify dimensions for browser rendering.
- Example:
  ```javascript
  options.addArguments("--window-size=1080,720");
  const meetLink = "https://meet.google.com/your-meet-code";
  await driver.get(meetLink);
  ```

## Use Cases

- **Automated Meeting Recordings**: Record important meetings for future review.
- **Note Summarization**: Generate concise meeting summaries with action items.
- **Virtual Assistant**: Handle repetitive Google Meet interactions efficiently.
- **Content Archival**: Archive audio/video and summaries from virtual sessions.

## Roadmap

- **Database Integration**: Store recordings and summaries directly in a database for easy retrieval.
- **Multi-Platform Support**: Expand to platforms like Zoom and Microsoft Teams.
- **Enhanced Summarization**: Add support for more advanced AI summarization models.

## Disclaimer

This project is for educational and personal use. Ensure you comply with the terms of service and privacy guidelines of Google Meet and any third-party services used.

---

**Contributions** are welcome! Fork the project, create a feature branch, and submit a pull request. Let’s build smarter meeting bots together!

```

### **How to Use This README**
- Replace placeholders like `yourusername` and `your-meet-code` with actual values.
- Ensure that the installation instructions are up-to-date with your project setup.
- If you deploy the project or add new features, update the `Roadmap` and `Use Cases` sections accordingly.

Let me know if you’d like further customization or help with deployment instructions! 🚀
