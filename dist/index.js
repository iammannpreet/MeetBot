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
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = require("selenium-webdriver/chrome");
function openMeet(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield driver.get('https://meet.google.com/goz-yohn-tqi');
            const popupButton = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Got it")]')), 10000);
            yield popupButton.click();
            const nameInput = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//input[@placeholder="Your name"]')), 10000);
            yield nameInput.clear();
            yield nameInput.click();
            yield nameInput.sendKeys('value', "Meeting bot");
            yield driver.sleep(1000);
            const buttonInput = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Ask to join")]')), 10000);
            buttonInput.click();
        }
        finally {
        }
    });
}
function getDriver() {
    return __awaiter(this, void 0, void 0, function* () {
        const options = new chrome_1.Options({});
        options.addArguments("--disable-blink-features=AutomationControlled");
        options.addArguments("--use-fake-ui-for-media-stream");
        options.addArguments("--window-size=1080,720");
        options.addArguments('--auto-select-desktop-capture-source=[RECORD]');
        options.addArguments('--auto-select-desktop-capture-source=[RECORD]');
        options.addArguments('--enable-usermedia-screen-capturing');
        options.addArguments('--auto-select-tab-capture-source-by-title="Meet"');
        options.addArguments('--allow-running-insecure-content');
        // ​​--allow-file-access-from-files--use-fake-device-for-media-stream--allow-running-insecure-content--allow-file-access-from-files--use-fake-device-for-media-stream--allow-running-insecure-content
        let driver = yield new selenium_webdriver_1.Builder().forBrowser(selenium_webdriver_1.Browser.CHROME).setChromeOptions(options).build();
        return driver;
    });
}
function handleSafetyPopup(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Checking for the safety pop-up...");
            const gotItButton = yield driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.xpath('//span[contains(text(), "Got it")]')), 5000 // Shorter wait since the pop-up appears after recording starts
            );
            yield gotItButton.click();
            console.log("Safety pop-up dismissed.");
        }
        catch (error) {
            console.warn("Safety pop-up not found or already dismissed.");
        }
    });
}
function startScreenshare(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("startScreensharecalled");
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
      
        console.log("before mediadevices")
        window.navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "browser"
            },
            audio: true,
            preferCurrentTab: true
        }).then(async screenStream => {                        
            const audioContext = new AudioContext();
            const screenAudioStream = audioContext.createMediaStreamSource(screenStream)
            const audioEl1 = document.querySelectorAll("audio")[0];
            const audioEl2 = document.querySelectorAll("audio")[1];
            const audioEl3 = document.querySelectorAll("audio")[2];
            const audioElStream1 = audioContext.createMediaStreamSource(audioEl1.srcObject)
            const audioElStream2 = audioContext.createMediaStreamSource(audioEl3.srcObject)
            const audioElStream3 = audioContext.createMediaStreamSource(audioEl2.srcObject)

            const dest = audioContext.createMediaStreamDestination();

            screenAudioStream.connect(dest)
            audioElStream1.connect(dest)
            audioElStream2.connect(dest)
            audioElStream3.connect(dest)

            // window.setInterval(() => {
            //   document.querySelectorAll("audio").forEach(audioEl => {
            //     if (!audioEl.getAttribute("added")) {
            //       console.log("adding new audio");
            //       const audioEl = document.querySelector("audio");
            //       const audioElStream = audioContext.createMediaStreamSource(audioEl.srcObject)
            //       audioEl.setAttribute("added", true);
            //       audioElStream.connect(dest)
            //     }
            //   })

            // }, 2500);
          
          // Combine screen and audio streams
          const combinedStream = new MediaStream([
              ...screenStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
          ]);
          navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser" },
          audio: true
      }).then(stream => {
          console.log("Screen recording started...");
      });
          console.log("before start recording")
          const recordedChunks = await startRecording(combinedStream, 10000);
          console.log("after start recording")
          
          let recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
          
          // Create download for video with audio
          const recording = document.createElement("video");
          recording.src = URL.createObjectURL(recordedBlob);
          
          const downloadButton = document.createElement("a");
          downloadButton.href = recording.src;
          downloadButton.download = "RecordedScreenWithAudio.webm";    
          downloadButton.click();
          
          console.log("after download button click")
          
          // Clean up streams
          screenStream.getTracks().forEach(track => track.stop());
          audioStream.getTracks().forEach(track => track.stop());
        })
        
    `);
        // Check for the "Got it" pop-up after a delay
        yield driver.sleep(3000); // Delay for the pop-up to appear
        yield handleSafetyPopup(driver);
        // Keep recording logic intact
        yield driver.sleep(10000); // Simulate recording time
        console.log("Recording complete.");
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const driver = yield getDriver();
        yield openMeet(driver);
        yield new Promise(x => setTimeout(x, 20000));
        // wait until admin lets u join
        yield startScreenshare(driver);
    });
}
main();
