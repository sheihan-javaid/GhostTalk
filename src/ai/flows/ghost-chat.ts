'use server';

import { GoogleGenerativeAI, Content } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    // The entire history, including the last user message, is needed for context.
    const formattedHistory: Content[] = history.map(msg => ({
      role: msg.role,
      parts: msg.content.map(text => ({ text })),
    }));

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // The last message is part of the history, so we pop it to send it.
    const lastUserMessage = formattedHistory.pop();
    if (!lastUserMessage) {
        return 'Could not process your message.';
    }

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    });

    // Send the last user message to the chat session.
    const result = await chat.sendMessage(lastUserMessage.parts);
    const response = result.response;
    const text = response.text();

    return text || '...';
  } catch (err) {
    console.error('Ghost AI Error:', err);
    return 'Something went wrong 👻';
  }
}
