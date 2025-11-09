'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import type { Message, UiSettings, ChatMessage, MessagePayload } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, KeyRound } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { decrypt, encrypt } from '@/lib/crypto';
import { getMyPublicKey, initializeKeys, importPublicKey } from '@/lib/e2ee';

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
  const [isKeysLoading, setIsKeysLoading] = useState(true);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // Initialize crypto keys and user profile on first load
  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
        setIsKeysLoading(true);
        await initializeKeys();
        setIsKeysLoading(false);

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
              participants: {},
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

  const roomRef = useMemoFirebase(() => {
    if (!firestore || !currentRoomId) return null;
    return doc(firestore, 'chatRooms', currentRoomId);
  }, [firestore, currentRoomId]);

  const { data: roomData } = useDoc(roomRef);

  // Publish public key and name to the room
  useEffect(() => {
    const publishPresence = async () => {
      if (roomRef && user && userName && !isKeysLoading && roomData) {
        const myPublicKey = await getMyPublicKey();
        if (myPublicKey) {
          const currentParticipants = roomData.participants || {};
          const myInfo = currentParticipants[user.uid];

          if (!myInfo || myInfo.publicKey !== myPublicKey || myInfo.name !== userName) {
            const updatePayload = {
              [`participants.${user.uid}`]: {
                publicKey: myPublicKey,
                name: userName,
              }
            };
            updateDocumentNonBlocking(roomRef, updatePayload);
          }
        }
      }
    };
    publishPresence();
  }, [roomRef, user, userName, isKeysLoading, roomData]);

  // NEW: Query the user's personal inbox
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user || isRoomLoading) return null;
    return query(
      collection(firestore, 'users', user.uid, 'inbox'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, user, isRoomLoading]);

  const { data: firestoreMessages } = useCollection<ChatMessage>(messagesQuery);
  
  // Decrypt and filter messages as they arrive
  useEffect(() => {
    if (!firestoreMessages) return;

    const processMessages = async () => {
      const now = Date.now();
      const expirySeconds = settings.messageExpiry;

      const processedMessages: Message[] = (await Promise.all(
        firestoreMessages.map(async (msg): Promise<Message | null> => {
          if (expirySeconds > 0 && msg.timestamp instanceof Timestamp) {
            const messageTime = msg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) return null;
          }

          try {
            const decryptedPayload: MessagePayload = JSON.parse(await decrypt(msg.encryptedPayload));
            
            // Only show messages for the current room
            if (decryptedPayload.roomId !== currentRoomId) {
                return null;
            }

            return {
              id: msg.id,
              text: decryptedPayload.text,
              userId: msg.senderId,
              username: msg.senderName,
              timestamp: msg.timestamp,
              anonymized: msg.anonymized,
              file: decryptedPayload.file,
            };
          } catch (e: any) {
            console.error(`Decryption error for message ID ${msg.id}:`, e);
            return { // Return a message indicating failure
              id: msg.id,
              text: '[Decryption Failed - Message may be corrupt]',
              userId: msg.senderId,
              username: 'System',
              timestamp: msg.timestamp,
              anonymized: false,
            };
          }
        })
      )).filter((msg): msg is Message => msg !== null);
      
      setMessages(processedMessages);
    };

    if (roomData) {
        processMessages();
    }
  }, [firestoreMessages, roomData, settings.messageExpiry, currentRoomId]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean, file?: File) => {
    if ((!rawText.trim() && !file) || isSending || !user || !userName || !currentRoomId || !firestore || !roomData) return;
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
      
      const payload: MessagePayload = {
        roomId: currentRoomId,
        text: textToSend,
        file: fileData,
      };

      const recipientIds = Object.keys(roomData.participants || {});
      if (recipientIds.length === 0) {
        toast({ variant: "destructive", title: "No one is in the room to receive your message." });
        setIsSending(false);
        return;
      }

      const ttl = new Date();
      ttl.setDate(ttl.getDate() + 15);

      for (const recipientId of recipientIds) {
        const recipientInfo = roomData.participants?.[recipientId];
        if (!recipientInfo?.publicKey) {
            console.warn(`No public key for recipient ${recipientId}. Skipping.`);
            continue;
        }

        const recipientPublicKey = await importPublicKey(recipientInfo.publicKey);
        const encryptedPayload = await encrypt(JSON.stringify(payload), recipientPublicKey);
      
        const newMessage: Omit<ChatMessage, 'id'> = {
            senderId: user.uid,
            senderName: userName,
            encryptedPayload: encryptedPayload,
            timestamp: serverTimestamp(),
            anonymized: shouldAnonymize && rawText !== textToSend,
            expireAt: ttl,
        };

        const inboxRef = collection(firestore, 'users', recipientId, 'inbox');
        addDocumentNonBlocking(inboxRef, newMessage);
      }
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
  }, [isSending, user, userName, currentRoomId, toast, firestore, roomData]);
  
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

  if (isUserLoading || isRoomLoading || !userName || isKeysLoading) {
    return (
        <div className="flex flex-col h-screen bg-background items-center justify-center text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="mt-4 text-lg">Initializing your secure session...</p>
             {isKeysLoading && 
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                    <span>Generating cryptographic keys...</span>
                </div>
            }
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
