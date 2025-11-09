'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const generateNamePrompt = ai.definePrompt({
    name: 'generateNamePrompt',
    prompt: `Generate one creative, anonymous username. The username should be dark, brutal, or have adult humor themes.
Return only the username, with no explanation or extra text.
Example: VoidGazer
Username:`
});


export async function generateAnonymousName(): Promise<{ name: string }> {
    try {
        const llmResponse = await generateNamePrompt();
        const name = llmResponse.text.trim().split('\n')[0].replace(/"/g, '');
        return { name: name || 'Anonymous' };
    } catch (error) {
        console.error('Failed to generate anonymous name with Genkit:', error);
        return { name: 'Anonymous' + Math.floor(Math.random() * 1000) };
    }
}
