import express from 'express';
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
    console.error('Error in workflow:', error);
    res.status(500).json({ error: 'Failed to process Meet workflow', details: (error as Error).message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});