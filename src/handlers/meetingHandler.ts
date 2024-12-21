import { By, WebDriver, until } from 'selenium-webdriver';
import { CaptionsText, MeetingLog } from '../types/types';

export async function openMeet(
  driver: WebDriver,
  meetLink: string,
  logs: MeetingLog[],
  updateLastLoggedText: (text: string | null) => string | null
): Promise<() => void> {
  try {
    await driver.get(meetLink);

    // Activate captions and other setup
    const ccButton = await driver.wait(until.elementLocated(By.css('button[jsname="r8qRAd"]')), 10000);
    await ccButton.click();

    console.log('Closed Captions activated');
    console.log('Monitoring captions...');

    // Monitor captions
    let monitoring = true;
    const intervalId = setInterval(async () => {
      if (!monitoring) return;

      try {
        const captionsText: CaptionsText = await driver.executeScript(() => {
          const div1 = document.querySelector('div.KcIKyf.jxFHg')?.textContent || '';
          const div2 = document.querySelector('div[jsname="tgaKEf"] span')?.textContent || '';
          return { div1, div2 };
        });

        const combinedText = `${captionsText.div1}: ${captionsText.div2}`.trim();

        if (combinedText && combinedText !== updateLastLoggedText(combinedText)) {
          const timestamp = new Date().toISOString();
          logs.push({ timestamp, combined: combinedText });
          console.log('Captured:', combinedText);
        }
      } catch (error) {
        console.error('Error monitoring captions:', error);
        monitoring = false; // Stop monitoring on error
        clearInterval(intervalId);
      }
    }, 500);

    // Return cleanup function
    return () => {
      monitoring = false;
      clearInterval(intervalId);
      console.log('Stopped monitoring captions.');
    };
  } catch (error) {
    console.error('Error in openMeet:', error);
    throw error;
  }
}

  
export async function startScreenshare(driver: WebDriver) {
  try {
    console.log('Starting screen share...');
    await driver.executeScript(`
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

        downloadButton.addEventListener('click', () => {
          window.localStorage.setItem('downloadClicked', 'true');
        });

        downloadButton.click();

        screenStream.getTracks().forEach(track => track.stop());
      });`);
    console.log('Screenshare initialized');
  } catch (error) {
    console.error('Error in startScreenshare:', error);
  }
}
