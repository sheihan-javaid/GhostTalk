'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAnonymousName(): Promise<{ name: string }> {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: `Generate one creative, anonymous username. The username should be dark, brutal, or have adult humor themes.
Return only the username, with no explanation or extra text.
Example: VoidGazer` }],
            max_tokens: 20,
            temperature: 1.2,
        });

        const name = completion.choices[0].message.content?.trim().replace(/"/g, '') || 'Anonymous';
        return { name };
    } catch (error) {
        console.error('Failed to generate anonymous name with OpenAI:', error);
        return { name: 'Anonymous' + Math.floor(Math.random() * 1000) };
    }
}
