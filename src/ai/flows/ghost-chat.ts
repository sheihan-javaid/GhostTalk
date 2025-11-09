'use server';

import { ai } from '@/ai/genkit';
import { MessageData, generate } from 'genkit/ai';

export async function ghostChat(history: MessageData[]): Promise<string> {
    try {
        const llmResponse = await ai.generate({
            prompt: history[history.length - 1].content[0].text,
            history: history.slice(0, -1),
        });

        return llmResponse.text || "👻 I’m GhostAI — but I couldn’t quite catch that.";
    } catch (err: any) {
        console.error('Ghost AI Error (Genkit):', err);
        return '❌ An error occurred. Please check the server console for details.';
    }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "👻 Hey, I’m GhostAI — your privacy-first chat that vanishes like a whisper. What’s on your mind?";
}
