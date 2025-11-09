'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * ghostChat — returns an ephemeral AI response (no state, no logs, no storage).
 */

import { ai } from '@/ai/genkit';
import { Part } from 'genkit';

// Message structure
interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  // Convert your messages into a Genkit-compatible chat prompt
  const genkitHistory = history.map((msg) => ({
    role: msg.role,
    parts: msg.content.map((c) => Part.text(c)), // ✅ use Part.text() instead of raw objects
  }));

  // Generate AI response
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    messages: genkitHistory, // ✅ use messages, not prompt
    config: {
      temperature: 0.8,
    },
  });

  // Return the model’s text output safely
  return response.output[0]?.content[0]?.text ?? '👻 The Ghost is silent...';
}
