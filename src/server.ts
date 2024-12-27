import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { main } from './main';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Endpoint to handle Google Meet workflow
app.post('/api/open-google-meet', async (req, res) => {
  const { meetLink, targetUser } = req.body;

  if (!meetLink || !targetUser) {
    return res.status(400).json({ error: 'Meet link and target user are required' });
  }

  try {
    await main(meetLink, targetUser); // Call the main function with Meet URL and target user
    res.json({ status: 'success', message: 'Meet workflow completed successfully' });
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
