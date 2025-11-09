'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import { useFileEncryption } from '@/hooks/use-file-encryption';
import type { Message, UiSettings } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from 'lucide-react';

const GHOST_USER_ID = 'ghost-user';

const defaultSettings: UiSettings = {
  messageExpiry: 300,
  themeColor: 'default',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  showUsername: true,
  animationIntensity: 'medium',
};

export default function ChatLayout({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [ghostName, setGhostName] = useState('A fellow Ghost');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { encryptFile, decryptFile } = useFileEncryption();

  useEffect(() => {
    // Generate a temporary, session-only user identity and AI-generated name
    const initializeUser = async () => {
      setUserId('user-' + crypto.randomUUID().slice(0, 8));
      try {
        const aiName = await generateAnonymousName();
        setUserName(aiName.name);
        const ghostAiName = await generateAnonymousName();
        setGhostName(ghostAiName.name);
      } catch (error) {
        console.error("Failed to generate anonymous name:", error);
        setUserName('User' + Math.floor(Math.random() * 9000 + 1000));
        setGhostName('A fellow Ghost');
      }
    };
    
    initializeUser();
  }, [roomId]);
  
  useEffect(() => {
    // Simulate initial welcome message from another user, only if a username is set
    async function showWelcomeMessage() {
      if (!userName) return;

      const welcomeText = `Welcome to room ${roomId === 'random-lobby' ? 'Random Lobby' : 'privée'}. Remember, what is said in the shadows, stays in the shadows.`;
      
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        text: welcomeText,
        encryptedText: '',
        userId: GHOST_USER_ID,
        username: ghostName,
        timestamp: Date.now(),
        anonymized: false,
      };
      setMessages([welcomeMessage]);
    }
    showWelcomeMessage();

  }, [roomId, userName, ghostName]);

  // Message Expiry Logic
  useEffect(() => {
    if (settings.messageExpiry === 0) return; // 0 means never expire

    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prevMessages =>
        prevMessages.filter(msg => (now - msg.timestamp) / 1000 < settings.messageExpiry)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.messageExpiry]);


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
                variant: 'default',
                title: "Message Anonymized",
                description: "Your message was altered by our AI to protect your privacy.",
                icon: <Sparkles className="text-accent" />,
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
          username: ghostName,
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
  }, [isSending, userId, userName, toast, encryptFile, ghostName]);
  
  const handleSettingsChange = (newSettings: Partial<UiSettings>) => {
    setSettings(prev => ({...prev, ...newSettings}));
  }

  useEffect(() => {
    const root = document.documentElement;
    if (settings.themeColor === 'default') {
      root.style.setProperty('--primary', '274 70% 31%');
      root.style.setProperty('--accent', '286 82% 55%');
    } else if (settings.themeColor === 'fire') {
      root.style.setProperty('--primary', '17 89% 47%');
      root.style.setProperty('--accent', '39 91% 55%');
    } else if (settings.themeColor === 'ice') {
        root.style.setProperty('--primary', '206 84% 35%');
        root.style.setProperty('--accent', '186 96% 77%');
    }
    
    if (settings.fontSize === 'small') {
        root.style.setProperty('--font-size', '0.875rem');
    } else if (settings.fontSize === 'medium') {
        root.style.setProperty('--font-size', '1rem');
    } else {
        root.style.setProperty('--font-size', '1.125rem');
    }
    
    document.body.dataset.bubbleStyle = settings.bubbleStyle;
    document.body.dataset.animationIntensity = settings.animationIntensity;

  }, [settings]);


  return (
    <div className={`flex flex-col h-screen bg-background animate-intensity-${settings.animationIntensity}`}>
      <ChatHeader roomId={roomId} onSettingsChange={handleSettingsChange} settings={settings} />
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} currentUserId={userId} showUsername={settings.showUsername} />
      </div>
      <div className="p-4 md:p-6 border-t border-border bg-background/80 backdrop-blur-sm">
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
      </div>
    </div>
  );
}
