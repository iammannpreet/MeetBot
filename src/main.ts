import { saveLogsToJson } from './logs/saveLogsToJson'; // Modularized function
import { getChromeDriver } from './drivers/chromeDriver';
import { openGoogleMeet } from './meetProviders/googleMeetAutomation';
import * as dotenv from 'dotenv';
import fs from 'fs';
import { HfInference } from '@huggingface/inference';
import { WebDriver } from 'selenium-webdriver';

dotenv.config();

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

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

async function summarizeMeetingNotes(filePath: string) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

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

    let summary = '';
    const outputFilePath = './src/logs/summary.txt';
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        summary += newContent;
        writeStream.write(newContent);
      }
    }

    writeStream.end();
    console.log(`Final Summary saved to ${outputFilePath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error summarizing meeting notes:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    
  }
}

export async function main(meetLink: string) {
  const driver = await getChromeDriver(); // Initialize the Chrome driver

  try {
    await openGoogleMeet(driver, meetLink);

    await new Promise((resolve) => setTimeout(resolve, 20000));

    await startScreenshare(driver);

    let downloadClicked = false;

    while (!downloadClicked) {
      const result = await driver.executeScript(`
        return window.localStorage.getItem('downloadClicked');
      `);

      if (result === 'true') {
        downloadClicked = true;

        await driver.executeScript(`window.localStorage.removeItem('downloadClicked');`);

        const filePath = await saveLogsToJson(logs);
        console.log(`Logs saved to: ${filePath}`);

        await summarizeMeetingNotes(filePath);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } finally {
    await driver.quit();
  }
}
