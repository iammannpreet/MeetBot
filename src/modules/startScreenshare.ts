import { WebDriver } from 'selenium-webdriver';

/**
 * Starts screen sharing and records the screen until a kill switch is activated.
 * @param {WebDriver} driver - Selenium WebDriver instance.
 * @param {object} killSwitch - Shared kill switch state.
 */
export async function startScreenshare(driver: WebDriver, killSwitch: { isActive: boolean }): Promise<void> {
  console.log("Starting screen sharing...");
  await driver.executeScript(`
    (async () => {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();

      window.stopScreenRecording = () => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "screen_recording.webm";
        a.click();
      };
    })();
  `);

  // Monitor the kill switch
  while (!killSwitch.isActive) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every second
  }

  console.log("Stopping screen sharing...");
  await driver.executeScript(`
    if (typeof window.stopScreenRecording === 'function') {
      window.stopScreenRecording();
    }
  `);

  console.log("Screen sharing terminated by kill switch.");
}
