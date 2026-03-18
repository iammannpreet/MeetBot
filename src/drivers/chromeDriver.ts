import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';

/**
 * Creates a WebDriver instance for Chrome with custom options.
 * @returns {Promise<WebDriver>} - A configured WebDriver instance.
 */
export async function getChromeDriver(): Promise<WebDriver> {
  const options = new Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--use-fake-ui-for-media-stream');
  options.addArguments('--window-size=1080,720');
  options.addArguments('--allow-running-insecure-content');

  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();
  return driver;
}