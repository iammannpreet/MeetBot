import { summarizeMeetingNotes } from './utils/summaryUtils';
import { getDriver } from './drivers/driverSetup';
import { openMeet, startScreenshare } from './handlers/meetingHandler';
import { saveLogsToJson } from './utils/logUtils';

export async function main(meetLink: string) {
  const driver = await getDriver();
  const logs: { timestamp: string; combined: string }[] = [];
  let lastLoggedText: string | null = null;

  const updateLastLoggedText = (text: string | null): string | null => {
    const previousText = lastLoggedText;
    lastLoggedText = text;
    return previousText;
  };

  let cleanup: () => void;

  try {
    // Initialize monitoring and get cleanup function
    cleanup = await openMeet(driver, meetLink, logs, updateLastLoggedText);
    await startScreenshare(driver);

    const filePath = saveLogsToJson(logs);
    await summarizeMeetingNotes(filePath);

    console.log('All tasks completed successfully.');
  } catch (error) {
    console.error('Error in main workflow:', error);
  } finally {
   
  }
}

