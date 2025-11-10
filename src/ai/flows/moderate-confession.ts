'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function moderateConfession(text: string): Promise<{ isAppropriate: boolean; reason?: string; }> {
  try {
    if (!text.trim()) {
        return { isAppropriate: true };
    }

    const completion = await openai.chat.completions.create({
        model: 'mistralai/mistral-7b-instruct:free', 
        messages: [
            {
                role: 'system',
                content: `You are a content moderator. Your task is to determine if the following text is appropriate.
The content should not contain hate speech, harassment, explicit content, or personally identifiable information.
Respond with a JSON object with two keys: "isAppropriate" (boolean) and "reason" (string, optional).`
            },
            {
                role: 'user',
                content: `Text: "${text}"`
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
    });
    
    const responseJson = completion.choices[0].message.content;

    if (!responseJson) {
      throw new Error('Moderator returned an empty response.');
    }

    const parsedResponse = JSON.parse(responseJson);

    return {
      isAppropriate: parsedResponse.isAppropriate,
      reason: parsedResponse.reason,
    };
  } catch (error) {
    console.error('Failed to moderate confession with OpenRouter:', error);
    // Fail closed: if moderation fails, assume it's not appropriate
    return {
      isAppropriate: false,
      reason: 'Content could not be automatically verified by the moderator.',
    };
  }
}
