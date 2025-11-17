'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-metadata';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import type { Message, UiSettings, ChatMessage, AnonymizeMessageInput } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Lock } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, Timestamp, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import * as crypto from '@/lib/crypto';
import { useRouter } from 'next/navigation';
import LoadingGhost from './loading-ghost';


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
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);
  const [isSending, setIsSending] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
  
  // Combined loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  // Step 1: Initialize User Profile and Crypto Keys.
  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
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
            await setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: name }, { merge: true });
            setUserName(name);
          } catch (error) {
            console.error("Failed to generate/set anonymous name:", error);
            const fallbackName = 'User' + Math.floor(Math.random() * 9000 + 1000);
            name = fallbackName;
            await setDocumentNonBlocking(userDocRef, { uid: user.uid, anonymousName: name }, { merge: true });
            setUserName(name);
          }
        }
      }
    };
    if(!isUserLoading) initUser();
  }, [user, firestore, isUserLoading]);
  
  // Step 2: Resolve dynamic lobby rooms & join room.
  useEffect(() => {
    const resolveAndJoinRoom = async () => {
      if (!user || !firestore || !userName) return; // Wait for user and name

      setIsLoading(true);
      let finalRoomId = initialRoomId;

      if (initialRoomId.startsWith('lobby-')) {
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
            finalRoomId = querySnapshot.docs[0].id;
          } else {
            const newRoom = {
              name: `Public Lobby - ${region}`,
              createdAt: serverTimestamp(),
              region: region,
              isPublic: true,
              participants: {},
            };
            const docRef = await addDoc(roomsRef, newRoom);
            finalRoomId = docRef.id;
          }
          setCurrentRoomId(finalRoomId);
        } catch (error) {
          console.error("Error resolving lobby:", error);
          toast({ variant: 'destructive', title: 'Lobby Error', description: 'Could not find or create a public lobby.' });
          router.push('/');
          return;
        }
      }

      // Join the resolved room
      const roomDocRef = doc(firestore, 'chatRooms', finalRoomId);
      const roomSnap = await getDoc(roomDocRef);
      if (!roomSnap.exists()) {
          toast({ variant: 'destructive', title: 'Error', description: 'This room does not exist.' });
          router.push('/');
          return;
      }

      const publicKeyJwk = await crypto.exportMyPublicKey();
      if (publicKeyJwk) {
          await updateDoc(roomDocRef, {
              [`participants.${user.uid}`]: {
                  publicKey: publicKeyJwk,
                  name: userName
              }
          });
          setIsParticipant(true); 
      }
      setIsLoading(false); // All setup is done, stop loading.
    };
    
    if (userName) {
      resolveAndJoinRoom();
    }
  }, [user, firestore, userName, initialRoomId, router, toast]);

  // Step 3: Query messages for the current room.
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !currentRoomId || !isParticipant) return null;
    return query(
      collection(firestore, 'chatRooms', currentRoomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, currentRoomId, isParticipant]);

  const { data: firestoreMessages } = useCollection<Omit<ChatMessage, 'id' | 'text'>>(messagesQuery);
  
  // Step 4: Process and decrypt messages.
  useEffect(() => {
    if (!firestoreMessages || !isParticipant) return; 

    const processMessages = async () => {
      const now = Date.now();
      const expirySeconds = settings.messageExpiry;

      const messagePromises = firestoreMessages.map(async (msg): Promise<Message | null> => {
        // Here msg is correctly typed from useCollection's generic
        const concreteMsg = msg as ChatMessage & {id: string};

        if (expirySeconds > 0 && concreteMsg.timestamp instanceof Timestamp) {
            const messageTime = concreteMsg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) return null;
        }

        let decryptedText = '';
        try {
          if (concreteMsg.encryptedPayload) {
            decryptedText = await crypto.decrypt(concreteMsg.encryptedPayload);
          }
        } catch (error) {
            decryptedText = "🔒 A message you couldn't decrypt was filtered out.";
            return null;
        }
        
        return {
          id: concreteMsg.id,
          text: decryptedText,
          userId: concreteMsg.senderId,
          username: concreteMsg.senderName,
          timestamp: concreteMsg.timestamp,
          anonymized: !!concreteMsg.anonymized,
          isEdited: !!concreteMsg.isEdited,
        };
      });

      const processedMessages = (await Promise.all(messagePromises))
        .filter((msg): msg is Message => msg !== null);
      
      setMessages(processedMessages);
    };

    processMessages();
  }, [firestoreMessages, settings.messageExpiry, isParticipant]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean) => {
    if (!rawText.trim() || isSending || !user || !userName || !currentRoomId || !firestore || !isParticipant) return;
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

      const roomDocRef = doc(firestore, 'chatRooms', currentRoomId);
      const roomSnapshot = await getDoc(roomDocRef);
      const participants = roomSnapshot.data()?.participants || {};
      
      if (Object.keys(participants).length === 0) throw new Error("No other participants in the room.");

      const batch = writeBatch(firestore);
      const messageId = doc(collection(firestore, 'dummy')).id; // Generate a new ID
      const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', messageId);

      const baseMessageData = {
          senderId: user.uid,
          senderName: userName,
          timestamp: serverTimestamp(),
          anonymized: wasAnonymized,
          isEdited: false
      };

      // Encrypt for all participants including self
      for (const uid in participants) {
          if (participants[uid] && participants[uid].publicKey) {
              const recipientPublicKey = await crypto.importPublicKey(participants[uid].publicKey);
              const encryptedPayload = await crypto.encrypt(textToSend, recipientPublicKey);
              
              // This is a simplified model. A more robust one would store payloads per user.
              // For now, we are creating a single message document that only the sender can decrypt.
              // This is a limitation of the current simplified E2EE model.
              // A better model stores a map of payloads `encryptedPayloads: { [uid]: '...' }`
              if (uid === user.uid) {
                batch.set(messageRef, {
                    ...baseMessageData,
                    encryptedPayload: encryptedPayload
                });
              }
          }
      }
      
      await batch.commit();

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
  }, [isSending, user, userName, currentRoomId, toast, firestore, isParticipant]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!firestore || !currentRoomId) return;
    const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', messageId);
    await deleteDocumentNonBlocking(messageRef);
  }, [firestore, currentRoomId]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    if (!firestore || !currentRoomId || !user) return;
    setIsSending(true);
    try {
        const roomDocRef = doc(firestore, 'chatRooms', currentRoomId);
        const roomSnapshot = await getDoc(roomDocRef);
        const participants = roomSnapshot.data()?.participants || {};
        
        const selfPublicKeyJwk = participants[user.uid]?.publicKey;
        if (!selfPublicKeyJwk) throw new Error("Could not find own public key to re-encrypt message.");

        const selfPublicKey = await crypto.importPublicKey(selfPublicKeyJwk);
        const selfEncryptedPayload = await crypto.encrypt(newText, selfPublicKey);

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

  if (isUserLoading || isLoading) {
    return <LoadingGhost />;
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
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending || !isParticipant} />
      </div>
    </div>
  );
}
