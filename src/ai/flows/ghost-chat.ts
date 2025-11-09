'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat using OpenRouter.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {genkit} from 'genkit';
import {openAI} from '@genkit-ai/openai';

const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    }),
  ],
  model: 'openai/gpt-3.5-turbo',
});

interface HistoryMessage {
  role: 'user' | 'model';
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
