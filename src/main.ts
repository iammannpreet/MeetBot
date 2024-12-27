import { getChromeDriver } from './drivers/chromeDriver';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { WebDriver } from 'selenium-webdriver';
import { joinGoogleMeet } from './modules/meetJoin';
import { monitorForKillSwitch } from './modules/killSwitch';
import { startScreenshare } from './modules/startScreenshare';

dotenv.config();
interface CaptionsText {
  div1: string; // Represents the speaker's name or other text content
  div2: string; // Represents the caption text
}

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // Store captured captions


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

  const intervalTime = 500; // Poll every second
  const buffer = [];
  while (!killSwitch.isActive) {
    try {
      const captionsText = await driver.executeScript(() => {
        const div1 = document.querySelector('div.KcIKyf.jxFHg')?.textContent || '';
        const div2 = document.querySelector('div[jsname="tgaKEf"] span')?.textContent || '';
        return { div1, div2 };
      }) as CaptionsText;
      if (captionsText.div2) {
        buffer.push(`${captionsText.div1}: ${captionsText.div2}`);
      }
      const combinedText = `${captionsText.div1}: ${captionsText.div2}`.trim();

    // Combine and save buffered captions every 5 seconds
    if (buffer.length > 0 && buffer.length % 10 === 0) {
      const combinedText = buffer.join(' ').trim();
      if (combinedText && combinedText !== lastLoggedText) {
        logs.push({ timestamp: new Date().toISOString(), combined: combinedText });
        lastLoggedText = combinedText;
      }
      buffer.length = 0; // Clear the buffer
    }
    } catch (error) {
      console.error("Error capturing captions:", (error as Error).message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalTime)); // Wait before the next iteration
  }

  console.log("Caption capture terminated by kill switch.");
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
    // Use the imported joinGoogleMeet function
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
    await driver.quit();
  }
}
