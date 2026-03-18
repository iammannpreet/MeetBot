import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'joining' | 'monitoring' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  meetLink: string;
  targetUser: string;
  createdAt: string;
  result?: { captionsPath: string; summaryPath: string };
  error?: string;
}

const jobs = new Map<string, Job>();

export function createJob(meetLink: string, targetUser: string): Job {
  const job: Job = {
    id: randomUUID(),
    status: 'queued',
    meetLink,
    targetUser,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

/**
 * Returns the job with the given ID.
 * Throws if the job does not exist — callers should never pass an unknown ID.
 */
export function getJob(id: string): Job {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`Job not found: ${id}`);
  }
  return job;
}

export function updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'result' | 'error'>>): Job {
  const job = getJob(id); // throws if missing
  Object.assign(job, updates);
  return job;
}
