
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
            model: 'qwen/qwen-2.5-7b-instruct',
            messages: [{ role: 'user', content: `You are an anonymous username generator. Your sole purpose is to create and return a single, creative, anonymous username.
CRITICAL INSTRUCTIONS:
1.  The username's theme must be dark, gothic, and mysterious.
2.  It should be a single word or two words combined without any spaces.
3.  You MUST return ONLY the username. Do not include any explanations, quotation marks, formatting, or extra text.

GOOD EXAMPLES:
- VoidborneLust
- Ravenblood
- NocturneSin
- AbyssalWhisper
- DarkenedVow
- MourningTemptation
- ObsidianDesire

Now, generate one username.` }],
            max_tokens: 128,
            temperature: 1.2,
        });

        // More robust cleaning: remove tokens, quotes, and spaces.
        const name = completion.choices[0].message.content?.trim().replace(/<s>|<\/s>|"/g, '').replace(/\s+/g, '') || 'FallenSpecter';
        
        return { name };
    } catch (error) {
        console.error('Failed to generate anonymous name with OpenRouter:', error);
        // Provide a themed fallback name
        const fallbacks = ['SinfulWhisper', 'GraveLurker', 'VelvetShadow', 'CrimsonTryst', 'VoidSeeker'];
        const name = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return { name };
    }
}
