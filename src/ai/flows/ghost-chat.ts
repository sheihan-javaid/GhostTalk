'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ChatMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: ChatMessage[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));
    
    const result = await model.generateContent({
        contents: formattedHistory
    });

    const response = await result.response;
    const text = response.text();
    return text;

  } catch (err: any) {
    console.error('Ghost AI Error:', err);
    return '❌ An error occurred. Please check the server console for details.';
  }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "Hello! 👋 I'm GhostAI. How can I help you today?";
}
