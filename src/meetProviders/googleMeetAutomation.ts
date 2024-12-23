import { WebDriver, By, until } from 'selenium-webdriver';

interface CaptionsText {
  div1: string;
  div2: string;
}

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // To store logs

export async function openGoogleMeet(driver: WebDriver, meetLink: string, logs: { timestamp: string; combined: string }[]) {

  try {
    await driver.get(meetLink);
    
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
    console.error('Error in openGoogleMeet function:', error);
  }
}
