'use server';

import OpenAI from 'openai';

export async function testApiKeyAction(): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY' || apiKey.trim() === '') {
        return 'Error: OPENAI_API_KEY is not set in your .env file.';
    }

    const openai = new OpenAI({
        apiKey: apiKey,
    });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say "hello".' }],
            max_tokens: 5,
        });
        const response = completion.choices[0].message.content;
        return `Success! API responded: "${response}"`;
    } catch (error: any) {
        console.error('API Key Test Error:', error);
        if (error.status === 401) {
            return `Failure: Authentication error (401). Your API key is likely invalid or revoked.`;
        }
        return `Failure: An error occurred. Check the server console for details. Error message: ${error.message}`;
    }
}
