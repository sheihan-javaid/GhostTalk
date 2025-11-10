'use server';

import OpenAI from 'openai';

export async function testApiKeyAction(): Promise<string> {
    'use server';
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY') {
        return 'Failure: OPENROUTER_API_KEY is not set in your .env file.';
    }

    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
    });

    try {
        const completion = await openai.chat.completions.create({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [{ role: 'user', content: 'Test prompt' }],
        });

        if (completion.choices[0].message.content) {
            return `Success! Received response: "${completion.choices[0].message.content}"`;
        } else {
            return 'Success! But the response was empty.';
        }
    } catch (error: any) {
        console.error('API Key Test Error:', error);
        return `Failure: An error occurred. Check the server console for details. Error message: ${error.message}`;
    }
}
