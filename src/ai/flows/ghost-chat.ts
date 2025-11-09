'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with your API key from environment variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Missing GOOGLE_API_KEY');
    }

    // Format chat history properly for Gemini
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.content.map(text => ({ text })),
    }));

    // Extract last user message (Gemini expects the new input separately)
    const lastUserMessage = formattedHistory.pop();
    if (!lastUserMessage || !lastUserMessage.parts?.length) {
      throw new Error('No valid user message found');
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Start a new chat session
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });

    // Send user’s latest message
    const result = await chat.sendMessage(lastUserMessage.parts);

    // Ensure valid response text
    const text = result?.response?.text?.() || '...';
    return text;
  } catch (err: any) {
    console.error('Ghost AI Error:', err.message || err);
    return 'Something went wrong 👻';
  }
}
