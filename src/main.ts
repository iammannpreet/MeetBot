import { saveLogsToJson } from './logstoJson/saveLogsToJson';
import { summarizeMeetingNotes } from './summarizer/summarMeetingNotes';
import { getChromeDriver } from './drivers/chromeDriver';
import { openGoogleMeet } from './meetProviders/googleMeetAutomation';
import { startScreenshare } from './screenshare/startScreenshare';
import * as dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';

dotenv.config();

const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);
const logs: { timestamp: string; combined: string }[] = [];

export async function main(meetLink: string) {
  const driver = await getChromeDriver();

  try {
    // Step 1: Open Google Meet
    await openGoogleMeet(driver, meetLink);

    // Step 2: Wait for captions to accumulate
    await new Promise((resolve) => setTimeout(resolve, 20000));

    // Step 3: Start screen sharing
    await startScreenshare(driver);

    // Step 4: Wait for download signal and process logs
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

        const summary = await summarizeMeetingNotes(filePath, client);
        console.log('Meeting Summary:', summary);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } finally {
    await driver.quit();
  }
}
