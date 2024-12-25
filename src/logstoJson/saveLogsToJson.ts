import fs from 'fs';
import path from 'path';

interface Log {
  timestamp: string;
  combined: string;
}

interface MeetingNote {
  speaker: string;
  text: string;
}

interface MeetingNotes {
  prompt: string;
  meeting_notes: {
    date: string;
    content: MeetingNote[];
  };
}

function isValidLog(log: any): log is Log {
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.timestamp === 'string' &&
    typeof log.combined === 'string'
  );
}

export async function saveLogsToJson(logs: Log[], directory: string = __dirname): Promise<string> {
  const filePath = path.join(directory, 'formatted_meeting_notes.json');

  const meetingNotes: MeetingNotes = {
    prompt: 'make sense of these meeting notes',
    meeting_notes: {
      date: new Date().toISOString().split('T')[0],
      content: logs
        .filter(isValidLog)
        .filter((log) => {
          const parts = log.combined.split(':');
          return parts.length > 1 && parts[1].trim();
        })
        .map((log) => {
          const [speaker, ...textParts] = log.combined.split(':');
          const text = textParts.join(':').trim();
          return {
            speaker: speaker.trim() || 'Silence',
            text: text || 'No text available',
          };
        }),
    },
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(meetingNotes, null, 2), 'utf8');
    console.log('Logs saved to formatted_meeting_notes.json');
  } catch (error) {
    console.error('Error saving logs to JSON file:', error);
  }

  return filePath;
}
