import { getChromeDriver } from './drivers/chromeDriver';
import { openGoogleMeet } from './meetProviders/googleMeetAutomation';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { By, until, WebDriver } from 'selenium-webdriver';

dotenv.config();

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // To store logs

async function startScreenshare(driver: WebDriver) {
  console.log('Starting screen share...');

  await driver.executeScript(`
    function wait(delayInMS) {
      return new Promise((resolve) => setTimeout(resolve, delayInMS));
    }

    function startRecording(stream, lengthInMS) {
      let recorder = new MediaRecorder(stream);
      let data = [];
      
      recorder.ondataavailable = (event) => data.push(event.data);
      recorder.start();
      
      let stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => reject(event.name);
      });
      
      let recorded = wait(lengthInMS).then(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      });
      
      return Promise.all([stopped, recorded]).then(() => data);
    }

    window.navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: true,
      preferCurrentTab: true
    }).then(async screenStream => {
      const audioContext = new AudioContext();
      const screenAudioStream = audioContext.createMediaStreamSource(screenStream);

      const dest = audioContext.createMediaStreamDestination();
      screenAudioStream.connect(dest);

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      const recordedChunks = await startRecording(combinedStream, 10000);
      let recordedBlob = new Blob(recordedChunks, { type: "video/webm" });

      const downloadButton = document.createElement("a");
      downloadButton.href = URL.createObjectURL(recordedBlob);
      downloadButton.download = "RecordedScreenWithAudio.webm";

      // Attach click listener to signal Node.js
      downloadButton.addEventListener('click', () => {
        window.localStorage.setItem('downloadClicked', 'true'); // Signal Node.js
      });

      downloadButton.click(); // Trigger the download programmatically

      screenStream.getTracks().forEach(track => track.stop());
    });
  `);

  console.log('Screenshare initialized');
}
async function saveLogsToJson(driver: WebDriver) {
  const filePath = path.join(__dirname, 'formatted_meeting_notes.json');

  // Step 1: Transform the logs to the required format
  const meetingNotes = {
    prompt: "Summarize the following meeting notes, ignore Silence and identify action items:",
    meeting_notes: {
      date: new Date().toISOString().split('T')[0], // Capture current system date (YYYY-MM-DD)
      content: logs
        .filter((log) => log.combined.includes(":")) // Exclude empty or malformed entries
        .map((log) => {
          const [speaker, ...textParts] = log.combined.split(":");
          const text = textParts.join(":").trim();
          return {
            speaker: speaker.trim() || "Silence", // Fallback for missing speaker
            text: text || "", // Ensure no undefined text
          };
        }),
    },
  };

  // Step 2: Write the transformed data to a JSON file
  try {
    fs.writeFileSync(filePath, JSON.stringify(meetingNotes, null, 2), 'utf8');
    console.log('Logs saved to formatted_meeting_notes.json');
  } catch (error) {
    console.error('Error saving logs to JSON file:', error);
  }

  return filePath; // Return the path of the saved file
}
async function summarizeMeetingNotes(filePath: string) {
  try {
    // Step 1: Read the JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Step 2: Send to Hugging Face for Summarization
    console.log('Sending meeting notes to Hugging Face for summarization...');
    const stream = client.chatCompletionStream({
      model: "01-ai/Yi-1.5-34B-Chat",
      messages: [
        { role: "user", content: JSON.stringify(data) }
      ],
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7
    });

    // Step 3: Stream the response and write to a text file
    let summary = '';
    const outputFilePath = path.join(__dirname, 'meeting_summary.txt');

    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' }); // Open file stream

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        summary += newContent;
        writeStream.write(newContent); // Write streamed content to file
      }
    }

    writeStream.end(); // Close the file stream after writing is complete

    console.log(`Final Summary saved to ${outputFilePath}`);
  } catch (error) {
    console.error('Error summarizing meeting notes:', (error as Error).message);
  }
}

export async function main(meetLink: string) {
  const driver = await getChromeDriver(); // This is used in subsequent function calls

  // Step 1: Open Google Meet
  await openGoogleMeet(driver, meetLink);

  // Allow captions to run for a while
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // Step 2: Start screen share
  await startScreenshare(driver);

  // Step 3: Wait for the download click signal
  console.log('Waiting for the download button to be clicked...');
  let downloadClicked = false;

  while (!downloadClicked) {
    const result = await driver.executeScript(`
      return window.localStorage.getItem('downloadClicked');
    `);

    if (result === 'true') {
      console.log('Download button clicked. Proceeding with saving logs and summarization...');
      downloadClicked = true;

      // Clear the signal
      await driver.executeScript(`window.localStorage.removeItem('downloadClicked');`);

      // Save logs to JSON
      const filePath = await saveLogsToJson(driver);

      // Summarize meeting notes
      await summarizeMeetingNotes(filePath);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second
    }
  }

  // Ensure the driver is properly closed
  await driver.quit();
}
