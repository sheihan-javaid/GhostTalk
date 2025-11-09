'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';

interface HistoryMessage {
  role: 'user' | 'model';
  content: { text: string }[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  const response = await ai.generate({
    prompt: history,
    config: {
      temperature: 0.8,
    },
  });

  return response.text;
}
