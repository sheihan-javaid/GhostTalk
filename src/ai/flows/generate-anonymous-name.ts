'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "https://ghost-talk-ai.web.app",
        "X-Title": "GhostTalk",
    },
});

export async function generateAnonymousName(): Promise<{ name: string }> {
    try {
        const completion = await openai.chat.completions.create({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [{ role: 'user', content: `Generate one creative, anonymous username. The username should be dark, brutal, or have adult humor themes. Return only the username, with no explanation or extra text. Examples: ShadowLurker, GrimJester, SerpentWhisper, CrimsonPhantom` }],
            max_tokens: 20,
            temperature: 1.2,
        });

        const name = completion.choices[0].message.content?.trim().replace(/"/g, '') || 'Anonymous';
        return { name };
    } catch (error) {
        console.error('Failed to generate anonymous name with OpenRouter:', error);
        return { name: 'Anonymous' + Math.floor(Math.random() * 1000) };
    }
}
