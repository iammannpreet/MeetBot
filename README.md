# MeetBot

MeetBot automates Google Meet interactions by joining meetings, handling pop-ups, recording audio/video, and summarizing notes. It integrates seamlessly with a frontend interface for ease of use.

## Features
- **Automated Meeting Join**: Enters name and requests to join.
- **Pop-Up Handling**: Dismisses "Got it" prompts.
- **Recording**: Captures screen and audio as `.webm`.
- **Summarization**: Saves Hugging Face summaries as `.txt`.
- **Frontend Interface**: Easily trigger the bot from a web UI.

## Tech Stack
- **Backend**: Node.js, Selenium WebDriver, ChromeDriver.
- **Frontend**: React (Repo: [MeetBot-Frontend](https://github.com/iammannpreet/MeetBot-Frontend)).
- **AI Summarization**: Hugging Face Inference API.

## Setup

### Backend
1. **Clone Repo**:
   ```bash
   git clone https://github.com/yourusername/meetbot.git
   cd meetbot
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment Variables**:
   - `HUGGINGFACE_API_KEY`
   - Ensure `chromedriver` is installed.

4. **Run Backend**:
   ```bash
   node dist/index.js
   ```

### Frontend
1. **Clone Frontend Repo**:
   ```bash
   git clone https://github.com/iammannpreet/MeetBot-Frontend.git
   cd MeetBot-Frontend
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start Frontend**:
   ```bash
   npm start
   ```

4. **Provide Google Meet Link**:
   Enter the link in the frontend, and it triggers the bot.

## How It Works
1. Enter a Google Meet link in the frontend.
2. Backend launches Chrome to join the meeting.
3. Handles pop-ups, activates captions, and records the session.
4. Saves:
   - **Video**: `RecordedScreenWithAudio.webm` (Local Storage).
   - **Summary**: `summary.txt` (Backend `/dist` folder).

## Use Cases
- Automate meeting recordings.
- Summarize sessions with action items.
- Archive important discussions.

---

**Disclaimer**: Ensure compliance with Google Meet’s terms of service. Contributions welcome! 🚀
