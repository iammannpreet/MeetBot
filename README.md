# MeetBot

MeetBot is an automated tool that simplifies Google Meet interactions by joining meetings, handling pop-ups, and recording audio/video streams seamlessly. Built with **Selenium WebDriver** and modern browser APIs, MeetBot automates repetitive tasks, making it ideal for virtual meeting management and content recording.

## Features

- **Automated Meeting Join**: Enters your name and clicks "Ask to join".
- **Dynamic Pop-Up Handling**: Detects and dismisses the "Got it" safety pop-up.
- **Screen & Audio Recording**: Combines video and all active audio streams into a single recording.
- **Downloadable Recordings**: Saves recordings in `webm` format for easy playback.
- **Customizable Automation**: Adjust window size, recording duration, and screen preferences.

## Technologies Used

- **Node.js**: Backend for script execution.
- **Selenium WebDriver**: Automates browser interactions.
- **JavaScript MediaRecorder API**: Captures and records screen and audio streams.
- **Chrome Driver**: Used for running automated tasks in Google Chrome.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/meetbot.git
   cd meetbot
   ```

2. **Install dependencies**:
   ```bash
   npm install selenium-webdriver
   ```

3. **Download ChromeDriver**:
   Ensure you have the correct version of [ChromeDriver](https://chromedriver.chromium.org/downloads) for your installed Chrome browser.

## Usage

1. **Run the bot**:
   ```bash
   node index.js
   ```

2. **Behavior**:
   - The bot will open the Google Meet link.
   - Fill in "Meeting bot" as the name and request to join.
   - Start recording your screen and audio.
   - Automatically handle pop-ups during recording.
   - Save the recording as a downloadable `RecordedScreenWithAudio.webm` file.

## Configuration

Adjust settings like screen size, recording duration, or Meet URL in the script:
```javascript
options.addArguments("--window-size=1080,720");
await driver.get('https://meet.google.com/your-meet-code');
```

## Use Cases

- **Automated Meeting Recordings**: Save important meetings for future review.
- **Virtual Assistant**: Handle repetitive Google Meet interactions effortlessly.
- **Content Archival**: Archive video/audio content from virtual sessions.

## Disclaimer

This project is intended for educational and personal use. Ensure you comply with Google Meet’s terms of service and privacy guidelines.

---

**Contributions** are welcome! Fork the project and submit a PR.
