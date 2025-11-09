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
import { Sparkles, Loader2, KeyRound } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

export default function ChatLayout({ roomId: initialRoomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
  const [isKeysLoading, setIsKeysLoading] = useState(true);

  const { toast } = useToast();
  const { encryptFile } = useFileEncryption();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // Initialize crypto keys on first load
  useEffect(() => {
    const init = async () => {
      if (user) {
        setIsKeysLoading(true);
        await initializeKeys();
        setIsKeysLoading(false);
      }
    };
    init();
  }, [user]);

  // Resolve dynamic lobby rooms
  useEffect(() => {
    const resolveLobby = async () => {
      if (initialRoomId.startsWith('lobby-')) {
        setIsRoomLoading(true);
        const region = initialRoomId.replace('lobby-', '');
        if (!firestore) return;
        const roomsRef = collection(firestore, 'chatRooms');
        const q = query(
          roomsRef,
          where('isPublic', '==', true),
          where('region', '==', region),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setCurrentRoomId(querySnapshot.docs[0].id);
        } else {
           const newRoom = {
                name: `Public Lobby - ${region}`,
                createdAt: serverTimestamp(),
                region: region,
                isPublic: true,
                publicKeys: {},
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
      if (user && !userName) {
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
  
  const roomRef = useMemoFirebase(() => {
    if (!firestore || !currentRoomId) return null;
    return doc(firestore, 'chatRooms', currentRoomId);
  }, [firestore, currentRoomId]);

  const { data: roomData } = useDoc(roomRef);

  // Publish public key to the room
  useEffect(() => {
    const publishPublicKey = async () => {
        if (roomRef && user && !isKeysLoading) {
            const myPublicKey = await getMyPublicKey();
            if (myPublicKey) {
                const roomSnapshot = await getDoc(roomRef);
                const currentPublicKeys = roomSnapshot.data()?.publicKeys || {};
                
                // Only update if the key is not already there
                if (currentPublicKeys[user.uid] !== myPublicKey) {
                    await updateDoc(roomRef, {
                        [`publicKeys.${user.uid}`]: myPublicKey,
                    });
                }
            }
        }
    };
    publishPublicKey();
  }, [roomRef, user, isKeysLoading]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomId || isRoomLoading || !user) return null;
    return query(
      collection(firestore, 'chatRooms', currentRoomId, 'messages'),
      where('recipientId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, currentRoomId, isRoomLoading, user]);

  const { data: firestoreMessages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  // Decrypt and filter messages as they arrive
  useEffect(() => {
    if (!firestoreMessages) return;

    const processMessages = async () => {
      const now = Date.now();
      const expirySeconds = settings.messageExpiry;

      const processedMessages = await Promise.all(
        firestoreMessages.map(async (msg) => {
          // Client-side expiry filtering
          if (expirySeconds > 0 && msg.timestamp instanceof Timestamp) {
            const messageTime = msg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) {
              return null; // This message has expired locally
            }
          }

          // Decryption
          try {
            const senderPublicKeyJwk = roomData?.publicKeys?.[msg.userId];
            if (!senderPublicKeyJwk) {
                return { ...msg, text: '[Waiting for sender key...]' };
            }
            const senderPublicKey = await importPublicKey(senderPublicKeyJwk);
            const decryptedText = await decrypt(msg.encryptedText, senderPublicKey);
            return { ...msg, text: decryptedText };
          } catch (e) {
            console.error('Decryption error:', e);
            return { ...msg, text: '[Decryption Failed]' };
          }
        })
      );
      
      const validMessages = processedMessages.filter((msg): msg is Message => msg !== null);
      setMessages(validMessages);
    };

    if (roomData) {
        processMessages();
    }
  }, [firestoreMessages, roomData, settings.messageExpiry]);


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
      
      const fileData = file ? await encryptFile(file) : undefined;
      const fullMessageText = fileData 
        ? `${textToSend}\n\nFile attached: ${file.name}` 
        : textToSend;

      const recipientIds = Object.keys(roomData.publicKeys || {}).filter(id => id !== user.uid);
      recipientIds.push(user.uid); // Also send to self

      const messagesRef = collection(firestore, 'chatRooms', currentRoomId, 'messages');
      const ttl = new Date();
      ttl.setDate(ttl.getDate() + 15);

      for (const recipientId of recipientIds) {
        const recipientPublicKeyJwk = roomData.publicKeys?.[recipientId];
        if (!recipientPublicKeyJwk) {
            console.warn(`No public key for recipient ${recipientId}. Skipping.`);
            continue;
        }

        const recipientPublicKey = await importPublicKey(recipientPublicKeyJwk);
        const encryptedText = await encrypt(fullMessageText, recipientPublicKey);
      
        const newMessage: Omit<Message, 'id' | 'timestamp'> = {
            encryptedText: encryptedText,
            text: '', // Text is now stored encrypted
            userId: user.uid,
            username: userName,
            recipientId: recipientId, // Set recipient for E2EE
            anonymized: shouldAnonymize && rawText !== textToSend,
            file: fileData ? {
            name: file.name,
            type: file.type,
            data: fileData,
            } : undefined,
        };

        const finalMessage = { 
            ...newMessage, 
            timestamp: serverTimestamp(),
            expireAt: ttl,
        };
        addDocumentNonBlocking(messagesRef, finalMessage);
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
  }, [isSending, user, userName, currentRoomId, toast, encryptFile, firestore, roomData]);
  
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
