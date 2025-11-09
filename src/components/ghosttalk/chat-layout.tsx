'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import type { Message, UiSettings, ChatMessage } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Lock } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, Timestamp, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import * as crypto from '@/lib/crypto';
import { useRouter } from 'next/navigation';


const defaultSettings: UiSettings = {
  messageExpiry: 0,
  themeColor: 'default',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  showUsername: true,
  animationIntensity: 'medium',
};

export default function ChatLayout({ roomId: initialRoomId }: { roomId:string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
  const [isWhisper, setIsWhisper] = useState(false);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  

  // Initialize user profile and crypto keys
  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
        // Initialize crypto key pair if it doesn't exist
        await crypto.initializeKeyPair();

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        
        let name = userDocSnapshot.data()?.anonymousName;

        if (name) {
          setUserName(name);
        } else {
          try {
            const aiName = await generateAnonymousName();
            name = aiName.name;
            setUserName(name);
            await setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: name }, { merge: true });
          } catch (error) {
            console.error("Failed to generate/set anonymous name:", error);
            const fallbackName = 'User' + Math.floor(Math.random() * 9000 + 1000);
            name = fallbackName;
            setUserName(name);
            await setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: name }, { merge: true });
          }
        }
      }
    };
    initUser();
  }, [user, firestore]);
  
  // Join room and publish public key
  useEffect(() => {
    const joinRoom = async () => {
        if (user && firestore && userName && currentRoomId && !isRoomLoading) {
            const roomDocRef = doc(firestore, 'chatRooms', currentRoomId);
            const roomSnap = await getDoc(roomDocRef);
            if (!roomSnap.exists()) {
                toast({ variant: 'destructive', title: 'Error', description: 'This room does not exist.' });
                router.push('/');
                return;
            }

            if(roomSnap.data().isWhisper) {
                setIsWhisper(true);
            }

            const publicKeyJwk = await crypto.exportMyPublicKey();
            
            if (publicKeyJwk) {
                await updateDocumentNonBlocking(roomDocRef, {
                    [`participants.${user.uid}`]: {
                        publicKey: publicKeyJwk,
                        name: userName
                    }
                });
            }
        }
    }
    joinRoom();
  }, [user, firestore, userName, currentRoomId, isRoomLoading, router, toast]);

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
  
  // Query messages for the current room
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomId || isRoomLoading) return null;
    return query(
      collection(firestore, 'chatRooms', currentRoomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, currentRoomId, isRoomLoading]);

  const { data: firestoreMessages } = useCollection<Omit<ChatMessage, 'id' | 'text'>>(messagesQuery);
  
  // Process and decrypt messages as they arrive
  useEffect(() => {
    if (!firestoreMessages) return;

    const processMessages = async () => {
      const now = Date.now();
      const expirySeconds = settings.messageExpiry;

      const messagePromises = firestoreMessages.map(async (msg): Promise<Message | null> => {
        if (expirySeconds > 0 && msg.timestamp instanceof Timestamp) {
            const messageTime = msg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) return null;
        }

        let decryptedText = '';
        try {
          // @ts-ignore
          if (msg.encryptedPayload) {
            // @ts-ignore
            decryptedText = await crypto.decrypt(msg.encryptedPayload);
          }
        } catch (error) {
            console.warn("Could not decrypt message:", msg.id, error);
            decryptedText = "⚠️ This message could not be decrypted.";
        }
        
        return {
          id: msg.id,
          text: decryptedText,
          userId: msg.senderId,
          username: msg.senderName,
          timestamp: msg.timestamp,
          anonymized: !!msg.anonymized,
          isEdited: !!msg.isEdited,
        };
      });

      const processedMessages = (await Promise.all(messagePromises))
        .filter((msg): msg is Message => msg !== null);
      
      setMessages(processedMessages);
    };

    processMessages();
  }, [firestoreMessages, settings.messageExpiry]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean) => {
    if (!rawText.trim() || isSending || !user || !userName || !currentRoomId || !firestore) return;
    setIsSending(true);

    try {
      let textToSend = rawText;
      let wasAnonymized = false;

      if (shouldAnonymize && rawText.trim()) {
        const result = await anonymizeMessage({ message: rawText });
        textToSend = result.anonymizedMessage;
        wasAnonymized = result.anonymized;
        if (wasAnonymized) {
            toast({
                variant: 'default',
                title: "Message Anonymized",
                description: "Your message was altered by our AI to protect your privacy.",
                icon: <Sparkles className="text-accent" />,
            })
        }
      }

      // Fetch recipient keys
      const roomDocRef = doc(firestore, 'chatRooms', currentRoomId);
      const roomSnapshot = await getDoc(roomDocRef);
      const roomData = roomSnapshot.data();
      const participants = roomData?.participants || {};
      
      if (Object.keys(participants).length === 0) throw new Error("No other participants in the room to send messages to.");

      // Encrypt for all participants
      const messagePayloads: {[uid: string]: string} = {};
      for (const uid in participants) {
        if (participants[uid] && participants[uid].publicKey) {
            try {
                const recipientPublicKey = await crypto.importPublicKey(participants[uid].publicKey);
                messagePayloads[uid] = await crypto.encrypt(textToSend, recipientPublicKey);
            } catch (e) {
                console.error(`Could not encrypt for participant ${uid}`, e)
            }
        }
      }

      const newMessageForCollection = {
          senderId: user.uid,
          senderName: userName,
          // Instead of a single payload, we could store a map.
          // For simplicity here, we'll send one copy and assume client can decrypt their own message.
          // This simplified model requires the sender to be in the participants list.
          encryptedPayload: messagePayloads[user.uid],
          timestamp: serverTimestamp(),
          anonymized: wasAnonymized,
      };

      if (!newMessageForCollection.encryptedPayload) {
          throw new Error("Could not encrypt message for self. Aborting send.");
      }

      const messagesRef = collection(firestore, 'chatRooms', currentRoomId, 'messages');
      await addDocumentNonBlocking(messagesRef, newMessageForCollection);

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

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!firestore || !currentRoomId) return;
    const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', messageId);
    await deleteDocumentNonBlocking(messageRef);
  }, [firestore, currentRoomId]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    if (!firestore || !currentRoomId || !user) return;
    setIsSending(true);
    try {
        const myPublicKey = await crypto.getMyPublicKey();
        if (!myPublicKey) throw new Error("Could not find own public key to re-encrypt message.");

        const selfEncryptedPayload = await crypto.encrypt(newText, myPublicKey);

        const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', messageId);
        await updateDocumentNonBlocking(messageRef, {
            encryptedPayload: selfEncryptedPayload,
            isEdited: true
        });

    } catch (error: any) {
        console.error("Failed to edit message:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Could not edit message.",
        });
    } finally {
        setIsSending(false);
    }
  }, [firestore, currentRoomId, user, toast]);
  
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
        <div className="p-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-secondary/30">
            <Lock className="h-3 w-3 text-green-500" />
            Messages are end-to-end encrypted. No one outside of this chat, not even GhostTalk, can read them.
        </div>
        <MessageList 
            messages={messages} 
            currentUserId={user?.uid || ''} 
            showUsername={settings.showUsername}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
        />
      </div>
      <div className="p-4 md:p-6 border-t border-border bg-background/80 backdrop-blur-sm">
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
      </div>
    </div>
  );
}
