'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';

// This defines the structure of a single message in the chat history.
interface HistoryMessage {
  role: 'user' | 'model';
  content: { text: string }[]; // Genkit expects content to be an array of objects with a 'text' property.
}

export async function ghostChat(history: { role: 'user' | 'model'; content: string[] }[]): Promise<string> {
  // Transform the incoming history to the format Genkit's `generate` function expects.
  const genkitHistory: HistoryMessage[] = history.map(msg => ({
    role: msg.role,
    content: msg.content.map(c => ({ text: c })), // Each string in content becomes an object { text: c }
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
