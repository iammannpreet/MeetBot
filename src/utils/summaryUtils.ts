import fs from 'fs';
import path from 'path';
import { HfInference } from '@huggingface/inference';
import * as dotenv from 'dotenv';
dotenv.config();
const client = new HfInference(process.env.HUGGINGFACE_API_KEY as string);

export async function summarizeMeetingNotes(filePath: string) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(data);

    const stream = client.chatCompletionStream({
      model: '01-ai/Yi-1.5-34B-Chat',
      messages: [{ role: 'user', content: JSON.stringify(parsedData) }],
    });

    const outputFilePath = path.join(__dirname, 'meeting_summary.txt');
    const writeStream = fs.createWriteStream(outputFilePath);

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      writeStream.write(content);
    }

    writeStream.end();
    console.log(`Summary saved to ${outputFilePath}`);
  } catch (error) {
    console.error('Error summarizing notes:', error);
    throw error;
  }
}
