'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ChatMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: ChatMessage[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Gemini expects `role` to be "user" or "model" and `parts` to contain text
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));

    // Pass the formatted history directly to generateContent()
    const result = await model.generateContent({
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512,
      },
    });

    const text = result.response.text();

    return text || "👻 I’m GhostAI — but I couldn’t quite catch that.";
  } catch (err: any) {
    console.error('Ghost AI Error:', err instanceof Error ? err.message : err);
    console.error(err);
    return '❌ An error occurred. Please check the server console for details.';
  }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "👻 Hey, I’m GhostAI — your privacy-first chat that vanishes like a whisper. What’s on your mind?";
}
