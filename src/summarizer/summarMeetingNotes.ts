import fs from 'fs';
import { HfInference } from '@huggingface/inference';

export async function summarizeMeetingNotes(
  filePath: string,
  client: HfInference
): Promise<string> {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log('Sending meeting notes to Hugging Face for summarization...');
    const stream = client.chatCompletionStream({
      model: '01-ai/Yi-1.5-34B-Chat',
      messages: [{ role: 'user', content: JSON.stringify(data) }],
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });

    let summary = '';
    const outputFilePath = './src/output/summary.txt';
    const writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        summary += newContent;
        writeStream.write(newContent);
      }
    }

    writeStream.end();
    console.log(`Final Summary saved to ${outputFilePath}`);
    return summary; // Return the final summary for additional use if needed
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error summarizing meeting notes:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return '';
  }
}
