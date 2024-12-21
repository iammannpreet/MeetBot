import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { main } from './main'; // Import the main function

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure output directory
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '../src/output');

app.use(cors());
// Middleware to handle raw binary uploads
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to trigger the Google Meet workflow
app.post('/api/open-google-meet', async (req: Request, res: Response) => {
  const { meetLink } = req.body;

  if (!meetLink) {
    return res.status(400).json({ error: 'Meet link is required' });
  }

  try {
    console.log(`Starting workflow for Meet link: ${meetLink}`);
    await main(meetLink); // Call the main function with the Meet URL
    res.status(200).json({ status: 'success', message: 'Meet workflow completed successfully' });
  } catch (error) {
    console.error('Error in Meet workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to process Meet workflow',
      details: errorMessage,
    });
  }
});

// Endpoint to upload and save the recording
app.post('/api/upload', (req: Request, res: Response) => {
  const outputFilePath = path.join(OUTPUT_DIR, 'RecordedScreenWithAudio.webm');

  // Ensure the output directory exists
  try {
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

    // Validate the request body
    if (!req.body || req.body.length === 0) {
      return res.status(400).send({ error: 'No file data received' });
    }

    // Save the file
    fs.writeFileSync(outputFilePath, req.body);
    console.log(`Recording saved to ${outputFilePath}`);
    res.status(200).send({ message: 'Recording uploaded successfully' });
  } catch (error) {
    console.error('Error saving recording:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).send({ error: 'Failed to save recording', details: errorMessage });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
});
