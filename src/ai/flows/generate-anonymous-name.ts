
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
            messages: [{ role: 'user', content: `Generate one creative, anonymous username. The username must have a dark, gothic, and adult/adulterous theme. It should be a single word or two words combined without spaces. Return only the username, with no explanation, formatting, or extra text.

Examples: VoidborneLust, RavenbloodAffair, NocturneSin, GraveyardParamour, AbyssalWhisper, DarkenedVow, MourningTemptation, ObsidianDesire, NightshadeLover, PhantomInVelvet, BlackThornSeduce, SinEaterKiss, GothicHeartbound, WraithInSilk, CrimsonTemptress, ShadowSeductress, VixenOfTheVoid, ForbiddenKiss, VelvetSinister, TemptationInBlack, SinfulWhisperer, SilkAndShadows, SeduceTheAbyss, DarkenedEnchantress, KissOfOblivion, SecretTemptation` }],
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
