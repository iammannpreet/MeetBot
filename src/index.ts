import { Builder, Browser, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // To store logs

interface CaptionsText {
  div1: string;
  div2: string;
}

async function openMeet(driver: WebDriver, meetLink: string) {
  try {
    await driver.get(meetLink); // Use the dynamic meetLink
    
    // Handle popups and name input
    const firstPopupButton = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')), 10000);
    await firstPopupButton.click();

    const nameInput = await driver.wait(until.elementLocated(By.xpath('//input[@placeholder="Your name"]')), 10000);
    await nameInput.clear();
    await nameInput.click();
    await nameInput.sendKeys('Meeting bot');
    await driver.sleep(1000);

    const buttonInput = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Ask to join")]')), 10000);
    await buttonInput.click();
    await driver.sleep(4000);

    const secondPopupButton = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')), 10000);
    await secondPopupButton.click();

    // Activate closed captions
    const ccButton = await driver.wait(until.elementLocated(By.css('button[jsname="r8qRAd"]')), 10000);
    await ccButton.click();
    console.log('Closed Captions activated');
  
    // Start monitoring captions
    console.log('Monitoring captions...');
    setInterval(async () => {
      const captionsText = await driver.executeScript((): CaptionsText => {
        const div1 = document.querySelector('div.KcIKyf.jxFHg')?.textContent || '';
        const div2 = document.querySelector('div[jsname="tgaKEf"] span')?.textContent || '';
        return { div1, div2 };
      }) as CaptionsText;

      const combinedText = `${captionsText.div1}: ${captionsText.div2}`.trim();

      if (combinedText && combinedText !== lastLoggedText) {
        const timestamp = new Date().toISOString();
        console.log('Captured Divs:');
        console.log('Combined:', combinedText);

        // Add to logs array
        logs.push({ timestamp, combined: combinedText });
        lastLoggedText = combinedText;
      }
    }, 500);
  } catch (error) {
    console.error('Error in openMeet function:', error);
  }
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
async function summarizeMeetingNotes(filePath: string, logCallback: (log: string) => void) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log('Sending meeting notes to Hugging Face for summarization...');
    const stream = client.chatCompletionStream({
      model: "01-ai/Yi-1.5-34B-Chat",
      messages: [{ role: "user", content: JSON.stringify(data) }],
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });

    let summary = '';
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        summary += newContent;

        console.log(newContent); // Log to console
        logCallback("newContent"); // Send log via callback
      }
    }

    console.log('Final Summary:', summary);
  } catch (error) {
    console.error('Error summarizing meeting notes:', (error as Error).message);
  }
}

async function startScreenshare(driver: WebDriver) {
  console.log('Starting screen share...');

  const response = await driver.executeScript(`
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
      downloadButton.click();

      screenStream.getTracks().forEach(track => track.stop());
    });
  `);

  console.log('Screenshare response:', response);
  driver.sleep(10000);
}

async function getDriver(): Promise<WebDriver> {
  const options = new Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--use-fake-ui-for-media-stream');
  options.addArguments('--window-size=1080,720');
  options.addArguments('--auto-select-desktop-capture-source=[RECORD]');
  options.addArguments('--enable-usermedia-screen-capturing');
  options.addArguments('--auto-select-tab-capture-source-by-title="Meet"');
  options.addArguments('--allow-running-insecure-content');

  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();
  return driver;
}

export async function main(meetLink: string, logCallback: (log: string) => void) {
  const driver = await getDriver();

  await openMeet(driver, meetLink);

  const filePath = await saveLogsToJson(driver);

  await summarizeMeetingNotes(filePath, logCallback);
  await startScreenshare(driver);
}
  ;
