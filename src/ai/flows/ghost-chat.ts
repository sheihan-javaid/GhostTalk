'use server';

import { GoogleGenerativeAI, Content } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    // Prepare chat history for Gemini
    const formattedHistory: Content[] = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));

    // For a chat session, we only need the history, not the last message separately.
    const lastUserMessage = formattedHistory.pop();
    if (!lastUserMessage) {
        return 'Could not process your message.';
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });

    const result = await chat.sendMessage(lastUserMessage.parts);
    const response = result.response;
    const text = response.text();

    return text || '...';
  } catch (err) {
    console.error('Ghost AI Error:', err);
    return 'Something went wrong 👻';
  }
}
