"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = require("selenium-webdriver/chrome");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const inference_1 = require("@huggingface/inference");
// Initialize Hugging Face Client
const client = new inference_1.HfInference(process.env.HUGGINGFACE_API_KEY);
let lastLoggedText = null;
const logs = []; // To store logs
function openGoogleMeet(driver, meetLink) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield driver.get(meetLink); // Use the dynamic meetLink
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
function startScreenshare(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting screen share...');
        yield driver.executeScript(`
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

      // Attach click listener to signal Node.js
      downloadButton.addEventListener('click', () => {
        window.localStorage.setItem('downloadClicked', 'true'); // Signal Node.js
      });

      downloadButton.click(); // Trigger the download programmatically

      screenStream.getTracks().forEach(track => track.stop());
    });
  `);
        console.log('Screenshare initialized');
    });
}
function saveLogsToJson(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path_1.default.join(__dirname, 'formatted_meeting_notes.json');
        // Step 1: Transform the logs to the required format
        const meetingNotes = {
            prompt: "Summarize the following meeting notes, ignore Silence and identify action items:",
            meeting_notes: {
                date: new Date().toISOString().split('T')[0], // Capture current system date (YYYY-MM-DD)
                content: logs
                    .filter((log) => log.combined.includes(":")) // Exclude empty or malformed entries
                    .map((log) => {
                    const [speaker, ...textParts] = log.combined.split(":");
                    const text = textParts.join(":").trim();
                    return {
                        speaker: speaker.trim() || "Silence", // Fallback for missing speaker
                        text: text || "", // Ensure no undefined text
                    };
                }),
            },
        };
        // Step 2: Write the transformed data to a JSON file
        try {
            fs_1.default.writeFileSync(filePath, JSON.stringify(meetingNotes, null, 2), 'utf8');
            console.log('Logs saved to formatted_meeting_notes.json');
        }
        catch (error) {
            console.error('Error saving logs to JSON file:', error);
        }
        return filePath; // Return the path of the saved file
    });
}
function summarizeMeetingNotes(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        try {
            // Step 1: Read the JSON file
            const data = JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
            // Step 2: Send to Hugging Face for Summarization
            console.log('Sending meeting notes to Hugging Face for summarization...');
            const stream = client.chatCompletionStream({
                model: "01-ai/Yi-1.5-34B-Chat",
                messages: [
                    { role: "user", content: JSON.stringify(data) }
                ],
                temperature: 0.5,
                max_tokens: 2048,
                top_p: 0.7
            });
            // Step 3: Stream the response and write to a text file
            let summary = '';
            const outputFilePath = path_1.default.join(__dirname, 'meeting_summary.txt');
            const writeStream = fs_1.default.createWriteStream(outputFilePath, { flags: 'w' }); // Open file stream
            try {
                for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                    _c = stream_1_1.value;
                    _d = false;
                    const chunk = _c;
                    if (chunk.choices && chunk.choices.length > 0) {
                        const newContent = chunk.choices[0].delta.content;
                        summary += newContent;
                        writeStream.write(newContent); // Write streamed content to file
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            writeStream.end(); // Close the file stream after writing is complete
            console.log(`Final Summary saved to ${outputFilePath}`);
        }
        catch (error) {
            console.error('Error summarizing meeting notes:', error.message);
        }
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
function main(meetLink) {
    return __awaiter(this, void 0, void 0, function* () {
        const driver = yield getDriver();
        // Step 1: Open Google Meet
        yield openGoogleMeet(driver, meetLink);
        // Allow captions to run for a while
        yield new Promise((resolve) => setTimeout(resolve, 20000));
        // Step 2: Start screen share
        yield startScreenshare(driver);
        // Step 3: Wait for the download click signal
        console.log('Waiting for the download button to be clicked...');
        let downloadClicked = false;
        while (!downloadClicked) {
            const result = yield driver.executeScript(`
      return window.localStorage.getItem('downloadClicked');
    `);
            if (result === 'true') {
                console.log('Download button clicked. Proceeding with saving logs and summarization...');
                downloadClicked = true;
                // Clear the signal
                yield driver.executeScript(`window.localStorage.removeItem('downloadClicked');`);
                // Save logs to JSON
                const filePath = yield saveLogsToJson(driver);
                // Summarize meeting notes
                yield summarizeMeetingNotes(filePath);
            }
            else {
                yield new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second
            }
        }
    });
}
;
