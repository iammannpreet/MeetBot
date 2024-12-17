"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = require("selenium-webdriver/chrome");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let lastLoggedText = null;
const logs = []; // To store logs
function openMeet(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield driver.get('https://meet.google.com/fji-eooj-qaf');
            // Handle popups and name input
            const firstPopupButton = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Got it")]')), 10000);
            yield firstPopupButton.click();
            const nameInput = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//input[@placeholder="Your name"]')), 10000);
            yield nameInput.clear();
            yield nameInput.click();
            yield nameInput.sendKeys('Meeting bot');
            yield driver.sleep(1000);
            const buttonInput = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Ask to join")]')), 10000);
            yield buttonInput.click();
            yield driver.sleep(4000);
            const secondPopupButton = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Got it")]')), 10000);
            yield secondPopupButton.click();
            // Activate closed captions
            const ccButton = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('button[jsname="r8qRAd"]')), 10000);
            yield ccButton.click();
            console.log('Closed Captions activated');
            // Start monitoring captions
            console.log('Monitoring captions...');
            setInterval(() => __awaiter(this, void 0, void 0, function* () {
                const captionsText = yield driver.executeScript(() => {
                    var _a, _b;
                    const div1 = ((_a = document.querySelector('div.KcIKyf.jxFHg')) === null || _a === void 0 ? void 0 : _a.textContent) || '';
                    const div2 = ((_b = document.querySelector('div[jsname="tgaKEf"] span')) === null || _b === void 0 ? void 0 : _b.textContent) || '';
                    return { div1, div2 };
                });
                const combinedText = `${captionsText.div1}: ${captionsText.div2}`.trim();
                if (combinedText && combinedText !== lastLoggedText) {
                    const timestamp = new Date().toISOString();
                    console.log('Captured Divs:');
                    console.log('Combined:', combinedText);
                    // Add to logs array
                    logs.push({ timestamp, combined: combinedText });
                    lastLoggedText = combinedText;
                }
            }), 500);
        }
        catch (error) {
            console.error('Error in openMeet function:', error);
        }
    });
}
function saveLogsToJson(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        // Save logs to a JSON file
        const filePath = path_1.default.join(__dirname, 'captions_logs.json');
        fs_1.default.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
        console.log('Logs saved to captions_logs.json');
        // Trigger file download
        const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
        yield driver.executeScript(`
    const blob = new Blob([arguments[0]], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'captions_logs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  `, fileContent);
    });
}
function startScreenshare(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting screen share...');
        const response = yield driver.executeScript(`
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
    });
}
function getDriver() {
    return __awaiter(this, void 0, void 0, function* () {
        const options = new chrome_1.Options();
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments('--use-fake-ui-for-media-stream');
        options.addArguments('--window-size=1080,720');
        options.addArguments('--auto-select-desktop-capture-source=[RECORD]');
        options.addArguments('--enable-usermedia-screen-capturing');
        options.addArguments('--auto-select-tab-capture-source-by-title="Meet"');
        options.addArguments('--allow-running-insecure-content');
        const driver = yield new selenium_webdriver_1.Builder().forBrowser(selenium_webdriver_1.Browser.CHROME).setChromeOptions(options).build();
        return driver;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const driver = yield getDriver();
        yield openMeet(driver);
        // Allow captions to run for a while
        yield new Promise((resolve) => setTimeout(resolve, 20000));
        // Save logs and start screen share
        yield saveLogsToJson(driver);
        yield startScreenshare(driver);
    });
}
main();
