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
import { Sparkles, Loader2 } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { decrypt, encrypt } from '@/lib/crypto';

const defaultSettings: UiSettings = {
  messageExpiry: 0, // No expiry for Firestore-backed chat
  themeColor: 'default',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  showUsername: true,
  animationIntensity: 'medium',
};

export default function ChatLayout({ roomId: initialRoomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);

  const { toast } = useToast();
  const { encryptFile } = useFileEncryption();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // Resolve dynamic lobby rooms
  useEffect(() => {
    const resolveLobby = async () => {
      if (initialRoomId.startsWith('lobby-')) {
        setIsRoomLoading(true);
        const region = initialRoomId.replace('lobby-', '');
        const roomsRef = collection(firestore, 'chatRooms');
        const q = query(
          roomsRef,
          where('isPublic', '==', true),
          where('region', '==', region),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setCurrentRoomId(querySnapshot.docs[0].id);
        } else {
           // No public lobby found, create one
            const newRoom = {
                name: `Public Lobby - ${region}`,
                createdAt: serverTimestamp(),
                region: region,
                isPublic: true,
            };
            const docRef = await addDoc(roomsRef, newRoom);
            setCurrentRoomId(docRef.id);
        }
        setIsRoomLoading(false);
      } else {
        setIsRoomLoading(false);
      }
    };
    if (firestore) {
      resolveLobby();
    }
  }, [initialRoomId, firestore]);

  // Generate user's anonymous name for the session
  useEffect(() => {
    const getUsername = async () => {
      if (user && !userName) { // Only generate if we have a user and no name yet
        try {
          const aiName = await generateAnonymousName();
          setUserName(aiName.name);
        } catch (error) {
          console.error("Failed to generate anonymous name:", error);
          setUserName('User' + Math.floor(Math.random() * 9000 + 1000));
        }
      }
    };
    getUsername();
  }, [user, userName]);
  
  // Memoize the Firestore query for messages
  const messagesQuery = useMemoFirebase(() => {
    if (!currentRoomId || isRoomLoading || !firestore) return null;
    return query(collection(firestore, 'chatRooms', currentRoomId, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, currentRoomId, isRoomLoading]);

  // Subscribe to real-time messages
  const { data: firestoreMessages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  // Decrypt messages as they arrive
  useEffect(() => {
    if (!firestoreMessages) return;

    const decryptMessages = async () => {
      const decrypted = await Promise.all(
        firestoreMessages.map(async (msg) => {
          try {
            const decryptedText = await decrypt(msg.encryptedText);
            return { ...msg, text: decryptedText };
          } catch (e) {
            return { ...msg, text: '[Decryption Failed]' };
          }
        })
      );
      setMessages(decrypted);
    };

    decryptMessages();
  }, [firestoreMessages]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean, file?: File) => {
    if ((!rawText.trim() && !file) || isSending || !user || !userName || !currentRoomId || !firestore) return;
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
      
      const encryptedText = await encrypt(textToSend);
      const fileData = file ? await encryptFile(file) : undefined;
      
      const newMessage: Omit<Message, 'id' | 'timestamp'> = {
        encryptedText: encryptedText,
        text: '', // Text is now stored encrypted
        userId: user.uid,
        username: userName,
        anonymized: shouldAnonymize && rawText !== textToSend,
        file: fileData ? {
          name: file.name,
          type: file.type,
          data: fileData,
        } : undefined,
      };

      const finalMessage = { ...newMessage, timestamp: serverTimestamp() };

      const messagesRef = collection(firestore, 'chatRooms', currentRoomId, 'messages');
      addDocumentNonBlocking(messagesRef, finalMessage);

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
  }, [isSending, user, userName, currentRoomId, toast, encryptFile, firestore]);
  
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

  if (isUserLoading || isRoomLoading || !userName) {
    return (
        <div className="flex flex-col h-screen bg-background items-center justify-center text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="mt-4 text-lg">Initializing your secure session...</p>
        </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen bg-background animate-intensity-${settings.animationIntensity}`}>
      <ChatHeader roomId={currentRoomId} onSettingsChange={handleSettingsChange} settings={settings} />
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} currentUserId={user?.uid || ''} showUsername={settings.showUsername} />
      </div>
      <div className="p-4 md:p-6 border-t border-border bg-background/80 backdrop-blur-sm">
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
      </div>
    </div>
  );
}

    