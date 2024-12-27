import { WebDriver, By, until } from 'selenium-webdriver';

/**
 * Function to join a Google Meet session.
 * @param {WebDriver} driver - Selenium WebDriver instance.
 * @param {string} meetLink - The Google Meet link to join.
 */
export async function joinGoogleMeet(driver: WebDriver, meetLink: string): Promise<void> {
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
    const gotItButton2 = await driver.wait(until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')), 600000);
    console.log("Admitted to the meeting.");
    await gotItButton2.click();

    // Enable captions
    const ccButton = await driver.wait(until.elementLocated(By.css('button[jsname="r8qRAd"]')), 1000);
    await ccButton.click();
    console.log("Captions enabled.");
  } catch (error) {
    console.error("Error in joinGoogleMeet:", (error as Error).message);
    throw error;
  }
}
