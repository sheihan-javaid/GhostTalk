'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import type { Message, UiSettings, ChatMessage } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const defaultSettings: UiSettings = {
  messageExpiry: 0,
  themeColor: 'default',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  showUsername: true,
  animationIntensity: 'medium',
};

export default function ChatLayout({ roomId: initialRoomId }: { roomId:string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // Initialize user profile on first load
  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const name = (await getDocs(query(collection(firestore, 'users'), where('uid', '==', user.uid)))).docs[0]?.data()?.anonymousName;

        if (name) {
          setUserName(name);
        } else {
          try {
            const aiName = await generateAnonymousName();
            setUserName(aiName.name);
            setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: aiName.name }, { merge: true });
          } catch (error) {
            console.error("Failed to generate/set anonymous name:", error);
            const fallbackName = 'User' + Math.floor(Math.random() * 9000 + 1000);
            setUserName(fallbackName);
            setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: fallbackName }, { merge: true });
          }
        }
      }
    };
    initUser();
  }, [user, firestore]);

  // Resolve dynamic lobby rooms
  useEffect(() => {
    const resolveLobby = async () => {
      if (initialRoomId.startsWith('lobby-') && firestore) {
        setIsRoomLoading(true);
        const region = initialRoomId.replace('lobby-', '');
        const roomsRef = collection(firestore, 'chatRooms');
        const q = query(
          roomsRef,
          where('isPublic', '==', true),
          where('region', '==', region),
          limit(1)
        );
        
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setCurrentRoomId(querySnapshot.docs[0].id);
          } else {
            const newRoom = {
              name: `Public Lobby - ${region}`,
              createdAt: serverTimestamp(),
              region: region,
              isPublic: true,
            };
            const docRef = await addDoc(roomsRef, newRoom);
            setCurrentRoomId(docRef.id);
          }
        } catch (error) {
          console.error("Error resolving lobby:", error);
        } finally {
          setIsRoomLoading(false);
        }
      } else {
        setIsRoomLoading(false);
      }
    };
    resolveLobby();
  }, [initialRoomId, firestore]);
  
  // Query messages for the current room
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomId || isRoomLoading) return null;
    return query(
      collection(firestore, 'chatRooms', currentRoomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, currentRoomId, isRoomLoading]);

  const { data: firestoreMessages } = useCollection<ChatMessage>(messagesQuery);
  
  // Process messages as they arrive
  useEffect(() => {
    if (!firestoreMessages) return;

    const now = Date.now();
    const expirySeconds = settings.messageExpiry;

    const processedMessages: Message[] = firestoreMessages
        .map((msg): Message | null => {
          if (expirySeconds > 0 && msg.timestamp instanceof Timestamp) {
            const messageTime = msg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) return null;
          }
          
          return {
            id: msg.id,
            text: msg.text,
            userId: msg.senderId,
            username: msg.senderName,
            timestamp: msg.timestamp,
            anonymized: !!msg.anonymized,
            file: msg.file,
          };
        })
      .filter((msg): msg is Message => msg !== null);
      
    setMessages(processedMessages);
  }, [firestoreMessages, settings.messageExpiry]);


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
      
      const fileData = file ? { name: file.name, type: file.type, data: await file.text() } : undefined;

      const newMessage: Omit<ChatMessage, 'id'> = {
          senderId: user.uid,
          senderName: userName,
          text: textToSend,
          timestamp: serverTimestamp(),
          anonymized: shouldAnonymize && rawText !== textToSend,
          file: fileData,
      };

      const messagesRef = collection(firestore, 'chatRooms', currentRoomId, 'messages');
      await addDocumentNonBlocking(messagesRef, newMessage);

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
  }, [isSending, user, userName, currentRoomId, toast, firestore]);
  
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
    } else if (settings.themeColor === 'forest') {
        root.style.setProperty('--primary', '120 61% 34%');
        root.style.setProperty('--accent', '135 65% 75%');
    } else if (settings.themeColor === 'cyberpunk') {
        root.style.setProperty('--primary', '54 100% 50%');
        root.style.setProperty('--accent', '325 100% 50%');
    } else if (settings.themeColor === 'noir') {
        root.style.setProperty('--primary', '0 0% 80%');
        root.style.setProperty('--accent', '0 0% 95%');
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
            <p className="mt-4 text-lg">Initializing your session...</p>
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
