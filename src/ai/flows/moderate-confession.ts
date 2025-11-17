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

// In-memory cache for moderation results
const moderationCache = new Map<string, { isAppropriate: boolean; reason?: string; }>();


export async function moderateConfession(text: string): Promise<{ isAppropriate: boolean; reason?: string; }> {
  const trimmedText = text.trim();
  try {
    if (!trimmedText) {
        return { isAppropriate: true };
    }

    // Check cache first
    if (moderationCache.has(trimmedText)) {
      return moderationCache.get(trimmedText)!;
    }

    const completion = await openai.chat.completions.create({
        model: 'qwen/qwen-2.5-7b-instruct', 
        messages: [
            {
                role: 'system',
                content: `You are a content moderator. Your task is to determine if the following text is appropriate for a public forum.
The content should not contain hate speech, harassment, explicit content, or personally identifiable information (like real names, addresses, emails, or phone numbers).
Respond with a JSON object with two keys: "isAppropriate" (boolean) and "reason" (a string explaining your decision if it's not appropriate).`
            },
            {
                role: 'user',
                content: `Text: "${trimmedText}"`
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 128,
    });
    
    const responseJson = completion.choices[0].message.content;

    if (!responseJson) {
      throw new Error('Moderator returned an empty response.');
    }

    const parsedResponse = JSON.parse(responseJson);

    // Ensure the response has the expected shape
    if (typeof parsedResponse.isAppropriate !== 'boolean') {
      throw new Error('Moderator returned an invalid response format.');
    }

    const result = {
      isAppropriate: parsedResponse.isAppropriate,
      reason: parsedResponse.reason,
    };
    
    // Store the result in the cache
    moderationCache.set(trimmedText, result);

    return result;
  } catch (error) {
    console.error('Failed to moderate confession with OpenRouter:', error);
    // Fail closed: if moderation fails for any reason, assume it's not appropriate
    return {
      isAppropriate: false,
      reason: 'Content could not be automatically verified by the moderator.',
    };
  }
}
