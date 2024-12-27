import { getChromeDriver } from './drivers/chromeDriver';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { By, until, WebDriver } from 'selenium-webdriver';

dotenv.config();
interface CaptionsText {
  div1: string; // Represents the speaker's name or other text content
  div2: string; // Represents the caption text
}

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // Store captured captions

async function joinGoogleMeet(driver: WebDriver, meetLink: string) {
  try {
    console.log("Navigating to Google Meet...");
    await driver.get(meetLink);

    // Handle initial popups
    const gotItButton = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')), 10000);
    await gotItButton.click();

    // Enter bot's name
    const nameInput = await driver.wait(until.elementLocated(By.xpath('//input[@placeholder="Your name"]')), 10000);
    await nameInput.clear();
    await nameInput.sendKeys("Mann's Meeting bot");

    // Click "Ask to join"
    const askToJoinButton = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Ask to join")]')), 5000);
    await askToJoinButton.click();

    // Wait for admission into the meeting (max 10 mins)
    console.log("Waiting for admission...");
    const GotItButton =await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')), 600000);
    console.log("Admitted to the meeting.");
    await GotItButton.click();
    const ccButton = driver.wait(until.elementLocated(By.css('button[jsname="r8qRAd"]')), 1000);
    await ccButton.click();
    console.log("Capturing Captions enabled.");
  } catch (error) {
    console.error("Error in joinGoogleMeet:", (error as Error).message);
    throw error;
  }
}
async function monitorForKillSwitch(driver: WebDriver, userLeftMessage: string, killSwitch: { isActive: boolean }) {
  console.log(`Monitoring for "${userLeftMessage}" to act as a kill switch...`);

  while (!killSwitch.isActive) {
    try {
      const pageText = await driver.executeScript(() => {
        return document.body.textContent || ''; // Fetch all visible text on the page
      }) as string; // Explicitly cast to string

      if (pageText.includes(userLeftMessage)) {
        console.log(`Kill switch triggered: "${userLeftMessage}" detected.`);
        killSwitch.isActive = true; // Activate the kill switch
        break;
      }
    } catch (error) {
      console.error("Error while monitoring for kill switch:", (error as Error).message);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second
  }
}


async function startConcurrentTasks(driver: WebDriver, userLeftMessage: string) {
  console.log("Starting concurrent tasks: screen sharing and caption capture...");

  const killSwitch = { isActive: false }; // Shared kill switch state

  // Monitor for the user leaving in parallel
  const monitorTask = monitorForKillSwitch(driver, userLeftMessage, killSwitch);

  // Run the main tasks (screen sharing and caption capturing)
  const mainTasks = Promise.all([
    startCapturingCaptions(driver, killSwitch), // Pass kill switch to captions task
    startScreenshare(driver, killSwitch), // Pass kill switch to screenshare task
  ]);

  // Wait for either the monitor task or main tasks to finish
  await Promise.race([monitorTask, mainTasks]);

  console.log("Concurrent tasks stopped by kill switch.");
}


async function startCapturingCaptions(driver: WebDriver, killSwitch: { isActive: boolean }): Promise<void> {
  console.log("Starting caption capture...");
  const intervalTime = 1000; // Poll every second

  while (!killSwitch.isActive) {
    try {
      const captionsText = await driver.executeScript(() => {
        const div1 = document.querySelector('div.KcIKyf.jxFHg')?.textContent || '';
        const div2 = document.querySelector('div[jsname="tgaKEf"] span')?.textContent || '';
        return { div1, div2 };
      }) as CaptionsText;

      const combinedText = `${captionsText.div1}: ${captionsText.div2}`.trim();

      if (combinedText && combinedText !== lastLoggedText) {
        logs.push({ timestamp: new Date().toISOString(), combined: combinedText });
        lastLoggedText = combinedText;
        console.log("Captured:", combinedText);
      }
    } catch (error) {
      console.error("Error capturing captions:", (error as Error).message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalTime)); // Wait before the next iteration
  }

  console.log("Caption capture terminated by kill switch.");
}



async function startScreenshare(driver: WebDriver, killSwitch: { isActive: boolean }): Promise<void> {
  console.log("Starting screen sharing...");
  await driver.executeScript(`
    (async () => {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();

      // Stop recording after a signal from the Node.js context
      window.stopScreenRecording = () => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "screen_recording.webm";
        a.click();
      };
    })();
  `);

  // Monitor the kill switch in the Node.js context
  while (!killSwitch.isActive) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every second
  }

  console.log("Kill switch activated. Stopping screen recording...");
  await driver.executeScript(`
    if (typeof window.stopScreenRecording === 'function') {
      window.stopScreenRecording();
    }
  `);

  console.log("Screen sharing terminated by kill switch.");
}



async function processMeetingData(driver: WebDriver): Promise<object> {
  try {
    console.log("Processing meeting data...");

    // Save captions to a JSON file
    const captionsPath = saveLogsToJson();
    console.log(`Captions saved at ${captionsPath}`);

    // Summarize captions
    const summaryPath = await summarizeMeetingNotes(captionsPath);
    console.log(`Summary saved at ${summaryPath}`);

    return { captionsPath, summaryPath };
  } catch (error) {
    console.error("Error processing meeting data:", (error as Error).message);
    throw error;
  }
}

function saveLogsToJson(): string {
  const filePath = path.join(__dirname, 'captions.json');

  // Get the current system time in EST
  const estDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  // Add a predefined heading and logs
  const meetingNotes = {
    heading: `Summarize these notes of the meeting held on ${estDate}. Ignore the repeated words and give me important tasks assigned and summary of the meeting.`,
    logs: logs.map((log) => ({
      timestamp: log.timestamp,
      content: log.combined,
    })),
  };

  // Write the data to the JSON file
  fs.writeFileSync(filePath, JSON.stringify(meetingNotes, null, 2), 'utf8');
  console.log("Logs saved with a predefined heading at", filePath);

  return filePath;
}


async function summarizeMeetingNotes(filePath: string): Promise<string> {
  try {
    console.log("Sending captions to Hugging Face for summarization...");
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const stream = client.chatCompletionStream({
      model: "01-ai/Yi-1.5-34B-Chat",
      messages: [{ role: "user", content: JSON.stringify(data) }],
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });

    let summary = '';
    const outputFilePath = path.join(__dirname, 'summary.txt');
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        summary += newContent;
        writeStream.write(newContent);
      }
    }

    writeStream.end();
    console.log(`Summary saved at ${outputFilePath}`);
    return outputFilePath;
  } catch (error) {
    console.error("Error summarizing meeting notes:", (error as Error).message);
    throw error;
  }
}
export async function main(meetLink: string, targetUser: string) {
  const driver = await getChromeDriver();

  try {
    await joinGoogleMeet(driver, meetLink);

    // Dynamically monitor for the user leaving
    const userLeftMessage = `${targetUser} has left the meeting`;

    // Start concurrent tasks with dynamic kill switch
    await startConcurrentTasks(driver, userLeftMessage);

    // Process meeting data after tasks are complete
    const processedData = await processMeetingData(driver);

    console.log("Meeting data processed successfully:", processedData);
  } catch (error) {
    console.error("Error in MeetBot:", (error as Error).message);
  } finally {
    console.log("Driver closed.");
  }
}