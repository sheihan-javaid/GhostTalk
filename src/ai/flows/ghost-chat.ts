'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';
import {Part} from 'genkit';

// This defines the structure of a single message in the chat history.
interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  // Transform the incoming history to the format Genkit's `generate` function expects for chat history.
  const genkitHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content.map(c => ({ text: c })),
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
