import { saveLogsToJson } from './logs/saveLogsToJson';
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
    await openGoogleMeet(driver, meetLink, logs);

    // Step 3: Start screen sharing
    const uploadComplete = await startScreenshare(driver);

    if (uploadComplete) {
      console.log('Recording uploaded successfully.');

      // Process logs and summarize meeting notes
      console.log('Logs content:', logs);

      const filePath = await saveLogsToJson(logs);
      console.log(`Logs saved to: ${filePath}`);

      try {
        const summary = await summarizeMeetingNotes(filePath, client);
        console.log('Meeting Summary:', summary);
      } catch (error) {
        console.error('Error during summarization:', error);
      }
    } else {
      console.error('Recording upload failed.');
    }
  } finally {
    await driver.quit();
  }
}
