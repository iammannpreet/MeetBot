import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createJob, getJob } from './jobManager';
import { runBotJob } from './main';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------
// POST /api/open-google-meet  — start a bot job, return jobId (202)
// ------------------------------------------------------------------
app.post('/api/open-google-meet', (req, res) => {
  const { meetLink, targetUser } = req.body;

  if (!meetLink || !targetUser) {
    return res.status(400).json({ error: 'Meet link and target user are required' });
  }

  const job = createJob(meetLink, targetUser);

  // Fire-and-forget — the job runs in the background
  runBotJob(job.id).catch((err) => {
    console.error(`Unhandled error in job ${job.id}:`, err);
  });

  return res.status(202).json({ jobId: job.id, status: job.status });
});

// ------------------------------------------------------------------
// GET /api/job/:id  — poll for job status
// ------------------------------------------------------------------
app.get('/api/job/:id', (req, res) => {
  try {
    const job = getJob(req.params.id);
    return res.json(job);
  } catch {
    return res.status(404).json({ error: 'Job not found' });
  }
});

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});