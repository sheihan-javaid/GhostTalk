'use server';

/**
 * @fileOverview A Genkit flow for a simple, stateless AI chat.
 *
 * - ghostChat - A function that returns a response from the AI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export async function ghostChat(history: Array<{role: 'user' | 'model'; content: string[]}>): Promise<string> {
    const response = await ai.generate({
        prompt: history.map(msg => ({
            role: msg.role,
            content: msg.content.map(c => ({ text: c }))
        })),
        config: {
            temperature: 0.8,
        }
    });

    return response.text;
}
