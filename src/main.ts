import { getChromeDriver } from './drivers/chromeDriver';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { By, until, WebDriver } from 'selenium-webdriver';
import { getJob, updateJob } from './jobManager';

dotenv.config();

interface CaptionsText {
  div1: string; // Speaker name
  div2: string; // Caption text
}

/** Per-job context — all mutable state lives here, never at module level. */
interface JobContext {
  jobId: string;
  killSwitch: { isActive: boolean };
  logs: { timestamp: string; combined: string }[];
  lastLoggedText: string | null;
  outputDir: string;
}

// Initialize Hugging Face Client
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely execute a script in the browser. If the window/session is gone,
 * activates the kill switch instead of crashing the process.
 */
async function safeExecuteScript(
  driver: WebDriver,
  script: string | (() => unknown),
  killSwitch: { isActive: boolean },
): Promise<unknown> {
  try {
    return await driver.executeScript(script);
  } catch (err) {
    const msg = (err as Error).message;
    if (
      msg.includes('no such window') ||
      msg.includes('web view not found') ||
      msg.includes('session not created') ||
      msg.includes('target window already closed') ||
      msg.includes('unable to connect to renderer')
    ) {
      console.warn('Browser window lost — activating kill switch.');
      killSwitch.isActive = true;
    } else {
      // Re-throw unexpected errors so they surface properly
      throw err;
    }
    return null;
  }
}

function resolveOutputDir(jobId: string): string {
  const base = process.env.OUTPUT_DIR || path.join(process.cwd(), 'output');
  const dir = path.join(base, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Meet lifecycle
// ---------------------------------------------------------------------------

async function joinGoogleMeet(driver: WebDriver, meetLink: string) {
  console.log('Navigating to Google Meet...');
  await driver.get(meetLink);

  // Handle initial popups
  const gotItButton = await driver.wait(
    until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')),
    10000,
  );
  await gotItButton.click();

  // Enter bot's name
  const nameInput = await driver.wait(
    until.elementLocated(By.xpath('//input[@placeholder="Your name"]')),
    10000,
  );
  await nameInput.clear();
  await nameInput.sendKeys("Mann's Meeting bot");

  // Click "Ask to join"
  const askToJoinButton = await driver.wait(
    until.elementLocated(By.xpath('//span[contains(text(), "Ask to join")]')),
    5000,
  );
  await askToJoinButton.click();

  // Wait for admission into the meeting (max 10 mins)
  console.log('Waiting for admission...');
  const admittedButton = await driver.wait(
    until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')),
    600000,
  );
  console.log('Admitted to the meeting.');
  await admittedButton.click();

  const ccButton = await driver.wait(
    until.elementLocated(By.css('button[jsname="r8qRAd"]')),
    1000,
  );
  await ccButton.click();
  console.log('Capturing Captions enabled.');
}

// ---------------------------------------------------------------------------
// Kill-switch monitor
// ---------------------------------------------------------------------------

async function monitorForKillSwitch(
  driver: WebDriver,
  userLeftMessage: string,
  killSwitch: { isActive: boolean },
) {
  console.log(`Monitoring for "${userLeftMessage}" to act as a kill switch...`);

  while (!killSwitch.isActive) {
    const pageText = (await safeExecuteScript(
      driver,
      'return document.body.textContent || "";',
      killSwitch,
    )) as string | null;

    if (pageText && pageText.includes(userLeftMessage)) {
      console.log(`Kill switch triggered: "${userLeftMessage}" detected.`);
      killSwitch.isActive = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// ---------------------------------------------------------------------------
// Caption capture
// ---------------------------------------------------------------------------

async function startCapturingCaptions(
  driver: WebDriver,
  ctx: JobContext,
): Promise<void> {
  console.log('Starting caption capture...');

  const intervalTime = 500;
  const buffer: string[] = [];

  while (!ctx.killSwitch.isActive) {
    const captionsText = (await safeExecuteScript(
      driver,
      `
        const div1 = document.querySelector('div.KcIKyf.jxFHg')?.textContent || '';
        const div2 = document.querySelector('div[jsname="tgaKEf"] span')?.textContent || '';
        return { div1, div2 };
      `,
      ctx.killSwitch,
    )) as CaptionsText | null;

    if (captionsText?.div2) {
      buffer.push(`${captionsText.div1}: ${captionsText.div2}`);
    }

    // Flush buffer every 10 entries
    if (buffer.length > 0 && buffer.length % 10 === 0) {
      const combinedText = buffer.join(' ').trim();
      if (combinedText && combinedText !== ctx.lastLoggedText) {
        ctx.logs.push({ timestamp: new Date().toISOString(), combined: combinedText });
        ctx.lastLoggedText = combinedText;
      }
      buffer.length = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalTime));
  }

  // Flush any remaining buffered captions
  if (buffer.length > 0) {
    const combinedText = buffer.join(' ').trim();
    if (combinedText && combinedText !== ctx.lastLoggedText) {
      ctx.logs.push({ timestamp: new Date().toISOString(), combined: combinedText });
    }
  }

  console.log('Caption capture terminated by kill switch.');
}

// ---------------------------------------------------------------------------
// Concurrent task orchestration (captions + kill-switch monitor)
// ---------------------------------------------------------------------------

async function startConcurrentTasks(driver: WebDriver, ctx: JobContext, userLeftMessage: string) {
  console.log('Starting concurrent tasks: kill-switch monitor and caption capture...');

  const monitorTask = monitorForKillSwitch(driver, userLeftMessage, ctx.killSwitch);
  const captionTask = startCapturingCaptions(driver, ctx);

  await Promise.race([monitorTask, captionTask]);

  // Ensure both settle
  ctx.killSwitch.isActive = true;
  await Promise.allSettled([monitorTask, captionTask]);

  console.log('Concurrent tasks finished.');
}

// ---------------------------------------------------------------------------
// Post-meeting processing
// ---------------------------------------------------------------------------

function saveLogsToJson(ctx: JobContext): string {
  const filePath = path.join(ctx.outputDir, 'captions.json');

  const estDate = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  const meetingNotes = {
    heading: `Summarize these notes of the meeting held on ${estDate}. Ignore the repeated words and give me important tasks assigned and summary of the meeting.`,
    logs: ctx.logs.map((log) => ({
      timestamp: log.timestamp,
      content: log.combined,
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(meetingNotes, null, 2), 'utf8');
  console.log('Logs saved at', filePath);

  return filePath;
}

async function summarizeMeetingNotes(filePath: string, outputDir: string): Promise<string> {
  console.log('Sending captions to Hugging Face for summarization...');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const stream = client.chatCompletionStream({
    model: '01-ai/Yi-1.5-34B-Chat',
    messages: [{ role: 'user', content: JSON.stringify(data) }],
    temperature: 0.5,
    max_tokens: 2048,
    top_p: 0.7,
  });

  let summary = '';
  const outputFilePath = path.join(outputDir, 'summary.txt');
  const writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

  for await (const chunk of stream) {
    if (chunk.choices && chunk.choices.length > 0) {
      const newContent = chunk.choices[0].delta.content;
      summary += newContent;
      writeStream.write(newContent);
    }
  }

  writeStream.end();
  console.log(`Summary saved at ${outputFilePath}`);
  return outputFilePath;
}

async function processMeetingData(ctx: JobContext): Promise<{ captionsPath: string; summaryPath: string }> {
  console.log('Processing meeting data...');

  const captionsPath = saveLogsToJson(ctx);
  console.log(`Captions saved at ${captionsPath}`);

  const summaryPath = await summarizeMeetingNotes(captionsPath, ctx.outputDir);
  console.log(`Summary saved at ${summaryPath}`);

  return { captionsPath, summaryPath };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs an entire bot session for the given job ID.
 * Looks up meetLink / targetUser from the job store.
 * Updates job status at each lifecycle stage.
 * Guarantees driver.quit() even on crash.
 */
export async function runBotJob(jobId: string): Promise<void> {
  const job = getJob(jobId); // throws if missing

  const ctx: JobContext = {
    jobId,
    killSwitch: { isActive: false },
    logs: [],
    lastLoggedText: null,
    outputDir: resolveOutputDir(jobId),
  };

  let driver: WebDriver | null = null;

  try {
    driver = await getChromeDriver();

    // --- Join ---
    updateJob(jobId, { status: 'joining' });
    await joinGoogleMeet(driver, job.meetLink);

    // --- Monitor & capture ---
    updateJob(jobId, { status: 'monitoring' });
    const userLeftMessage = `${job.targetUser} has left the meeting`;
    await startConcurrentTasks(driver, ctx, userLeftMessage);

    // --- Process ---
    updateJob(jobId, { status: 'processing' });
    const result = await processMeetingData(ctx);

    updateJob(jobId, { status: 'completed', result });
    console.log(`Job ${jobId} completed successfully.`);
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`Job ${jobId} failed:`, errorMsg);
    updateJob(jobId, { status: 'failed', error: errorMsg });
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch {
        // driver may already be dead — that's fine
      }
      console.log(`Driver closed for job ${jobId}.`);
    }
  }
}