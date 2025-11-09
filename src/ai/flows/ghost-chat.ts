'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API with your key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is missing from environment variables.');
    }

    // Format chat history properly
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Get the last message (most recent user message)
    const lastUserMessage = formattedHistory.pop();
    if (!lastUserMessage) {
      throw new Error('No user message found in history.');
    }

    // Create a chat session with previous history
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });

    // Send the last message
    const result = await chat.sendMessage(lastUserMessage.parts);
    const response = result.response;
    const text = response.text();

    return text || '...';

  } catch (err) {
    console.error('Ghost AI Error:', err instanceof Error ? err.message : err);
    console.error(err);
    return 'Something went wrong 👻';
  }
}
