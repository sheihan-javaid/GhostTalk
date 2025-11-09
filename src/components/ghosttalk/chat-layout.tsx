'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { useFileEncryption } from '@/hooks/use-file-encryption';
import type { Message } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";

const GHOST_USER_ID = 'ghost-user';
const GHOST_USER_NAME = 'A fellow Ghost';

export default function ChatLayout({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [messageExpiry, setMessageExpiry] = useState<number>(300); // 5 minutes in seconds
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { encryptFile, decryptFile } = useFileEncryption();

  useEffect(() => {
    // Generate a temporary, session-only user identity.
    setUserId('user-' + crypto.randomUUID().slice(0, 8));
    setUserName('User' + Math.floor(Math.random() * 9000 + 1000));
    
    // Simulate initial welcome message from another user
    async function showWelcomeMessage() {
      const welcomeText = `Welcome to room ${roomId === 'random-lobby' ? 'Random Lobby' : 'privée'}. Remember, what is said in the shadows, stays in the shadows.`;
      
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        text: welcomeText,
        encryptedText: '',
        userId: GHOST_USER_ID,
        username: GHOST_USER_NAME,
        timestamp: Date.now(),
        anonymized: false,
      };
      setMessages([welcomeMessage]);
    }
    showWelcomeMessage();

  }, [roomId]);

  // Message Expiry Logic
  useEffect(() => {
    if (messageExpiry === 0) return; // 0 means never expire

    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prevMessages =>
        prevMessages.filter(msg => (now - msg.timestamp) / 1000 < messageExpiry)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [messageExpiry]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean, file?: File) => {
    if ((!rawText.trim() && !file) || isSending) return;
    setIsSending(true);

    try {
      let textToSend = rawText;
      if (shouldAnonymize && rawText.trim()) {
        const result = await anonymizeMessage({ message: rawText });
        textToSend = result.anonymizedMessage;
        if (rawText !== textToSend) {
          toast({
              title: "Message Anonymized",
              description: "Your message was altered by our AI to protect your privacy.",
          })
        }
      }
      
      const fileData = file ? await encryptFile(file) : undefined;

      const newMessage: Message = {
        id: crypto.randomUUID(),
        text: textToSend, // In a real app, this would be decrypted on receive
        encryptedText: '',
        userId: userId,
        username: userName,
        timestamp: Date.now(),
        anonymized: shouldAnonymize && rawText !== textToSend,
        file: fileData ? {
          name: file.name,
          type: file.type,
          data: fileData,
        } : undefined,
      };
      
      setMessages(prev => [...prev, newMessage]);

      // Simulate a reply from another user
      setTimeout(async () => {
        const replyText = "Interesting...";
        const replyMessage: Message = {
          id: crypto.randomUUID(),
          text: replyText,
          encryptedText: '',
          userId: GHOST_USER_ID,
          username: GHOST_USER_NAME,
          timestamp: Date.now(),
          anonymized: false,
        };
        setMessages(prev => [...prev, replyMessage]);
      }, 1500 + Math.random() * 1000);


    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not send message. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  }, [isSending, userId, userName, toast, encryptFile]);
  

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader roomId={roomId} onSettingsChange={setMessageExpiry} messageExpiry={messageExpiry} />
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} currentUserId={userId} />
      </div>
      <div className="p-4 md:p-6 border-t border-border bg-background/80 backdrop-blur-sm">
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
      </div>
    </div>
  );
}
