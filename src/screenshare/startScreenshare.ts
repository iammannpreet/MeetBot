import { WebDriver } from 'selenium-webdriver';

export async function startScreenshare(driver: WebDriver): Promise<boolean> {
  console.log('Starting screen share...');

  const uploadComplete = await driver.executeAsyncScript<boolean>(`
    const callback = arguments[arguments.length - 1];

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

      // Upload the recording to the server
      const arrayBuffer = await recordedBlob.arrayBuffer();
      await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="RecordedScreenWithAudio.webm"',
        },
        body: arrayBuffer,
      });

      // Notify upload completion
      screenStream.getTracks().forEach(track => track.stop());
      callback(true);
    }).catch(error => {
      console.error('Error during screen share:', error);
      callback(false);
    });
  `) as boolean;

  console.log('Screenshare initialized');
  return uploadComplete;
}
