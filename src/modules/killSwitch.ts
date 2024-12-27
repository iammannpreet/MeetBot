import { WebDriver } from 'selenium-webdriver';

/**
 * Function to monitor the page for a specific user leaving the meeting.
 * @param {WebDriver} driver - Selenium WebDriver instance.
 * @param {string} userLeftMessage - The message indicating a user has left.
 * @param {{ isActive: boolean }} killSwitch - A shared kill switch state object.
 */
export async function monitorForKillSwitch(
  driver: WebDriver,
  userLeftMessage: string,
  killSwitch: { isActive: boolean }
): Promise<void> {
  console.log(`Monitoring for "${userLeftMessage}" to act as a kill switch...`);

  while (!killSwitch.isActive) {
    try {
      const pageText = (await driver.executeScript(() => {
        return document.body.textContent || ''; // Fetch all visible text on the page
      })) as string; // Explicitly cast to string

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
