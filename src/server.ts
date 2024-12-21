import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { main } from './main'; // Import the main function

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// API route to trigger the Google Meet workflow
app.post('/api/open-meet', async (req: Request, res: Response) => {
  const { meetLink } = req.body;

  if (!meetLink) {
    return res.status(400).json({ error: 'Meet link is required' });
  }

  try {
    console.log(`Received request to process Meet link: ${meetLink}`);
    await main(meetLink); // Call the main workflow function
    res.status(200).json({ status: 'success', message: 'Meet workflow completed successfully' });
  } catch (error) {
    console.error('Error in Meet workflow:', error);
    res.status(500).json({
      error: 'Failed to process Meet workflow',
      details: (error as Error).message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
