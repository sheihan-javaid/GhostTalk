'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
}

export async function moderateConfession(text: string): Promise<ModerationResult> {
  const prompt = `You are a content moderator for a public anonymous forum. 
    Your job is to determine if a message is appropriate for a general audience.
    The content should not contain hate speech, explicit sexual content, excessive violence, or personal identifying information.
    
    Analyze the following text:
    "${text}"

    Is this text appropriate? Respond with only a JSON object with two keys: "isAppropriate" (a boolean) and "reason" (a string, which can be empty if the content is appropriate).
    Example for appropriate: {"isAppropriate": true, "reason": ""}
    Example for inappropriate: {"isAppropriate": false, "reason": "The content contains hate speech."}
    `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    const parsed = JSON.parse(responseText);
    return {
      isAppropriate: parsed.isAppropriate,
      reason: parsed.reason,
    };
  } catch (error) {
    console.error('Failed to moderate confession:', error);
    // Default to inappropriate on error to be safe
    return {
      isAppropriate: false,
      reason: 'Could not be analyzed by the moderator.',
    };
  }
}
