'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';
import {Part} from 'genkit';

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  const genkitHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content.map(c => Part.text(c)),
  }));

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: genkitHistory,
    config: {
      temperature: 0.8,
    },
  });

  return response.text;
}
