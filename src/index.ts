import { Builder, Browser, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import fs from 'fs';
import path from 'path';

let lastLoggedText: string | null = null;
const logs: { timestamp: string; combined: string }[] = []; // To store logs

interface CaptionsText {
  div1: string;
  div2: string;
}

async function openMeet(driver: WebDriver) {
  try {
    await driver.get('https://meet.google.com/fji-eooj-qaf');

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
  // Save logs to a JSON file
  const filePath = path.join(__dirname, 'captions_logs.json');
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');

  console.log('Logs saved to captions_logs.json');

  // Trigger file download
  const fileContent = fs.readFileSync(filePath, 'utf8');
  await driver.executeScript(`
    const blob = new Blob([arguments[0]], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'captions_logs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  `, fileContent);
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

async function getDriver() {
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

async function main() {
  const driver = await getDriver();
  await openMeet(driver);

  // Allow captions to run for a while
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // Save logs and start screen share
  await saveLogsToJson(driver);
  await startScreenshare(driver);
}

main();
