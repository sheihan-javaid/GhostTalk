'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';
import {Part, Role} from 'genkit';

interface HistoryMessage {
  role: Role;
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  const response = await ai.generate({
    prompt: history.map(msg => ({
      role: msg.role,
      content: msg.content.map(text => ({text})),
    })),
    config: {
      temperature: 0.8,
    },
  });

  return response.text;
}
