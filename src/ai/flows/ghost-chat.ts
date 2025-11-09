'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    // Format chat history properly for Gemini
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));
    
    const lastUserMessage = formattedHistory.pop();
    if (!lastUserMessage) {
        return "I can't respond to an empty message.";
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(lastUserMessage.parts);
    const response = result.response;
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
