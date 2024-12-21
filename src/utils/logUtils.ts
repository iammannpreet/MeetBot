import fs from 'fs';
import path from 'path';
import { MeetingLog } from '../types/types';

export function saveLogsToJson(logs: MeetingLog[]): string {
  const filePath = path.join(__dirname, 'meeting_notes.json');
  const content = logs.map(({ timestamp, combined }) => {
    const [speaker, ...textParts] = combined.split(':');
    return {
      timestamp,
      speaker: speaker.trim() || 'Unknown',
      text: textParts.join(':').trim(),
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  console.log('Logs saved to JSON file');
  return filePath;
}
