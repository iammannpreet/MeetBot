import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { main } from './index'; // Import the main function from index.ts

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

let sseClients: Response[] = [];
// SSE endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client to SSE clients list
  sseClients.push(res);

  // Remove client on connection close
  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

app.post('/api/open-meet', async (req, res) => {
  const { meetLink } = req.body;

  if (!meetLink) {
    return res.status(400).json({ error: 'Meet link is required' });
  }

  try {
    await main(meetLink); // Call the main function with the Meet URL
    res.json({ status: 'success', message: 'Meet workflow completed successfully' });
  } catch (error) {
    console.error('Error in workflow:', error);
    res.status(500).json({ error: 'Failed to process Meet workflow', details: (error as Error).message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
