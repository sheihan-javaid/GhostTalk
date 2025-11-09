'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    // Prepare chat history for Gemini
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.content.map(text => ({ text })),
    }));

    // Create a chat session
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });

    // Get model reply
    const lastUserMessage = history[history.length - 1]?.content?.join(' ') || '';
    const response = await chat.sendMessage(lastUserMessage);

    // Extract the AI text safely
    const reply = response.response.text();

    return reply || '...';
  } catch (err) {
    console.error('Ghost AI Error:', err);
    return 'Something went wrong 👻';
  }
}
