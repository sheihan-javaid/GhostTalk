
'use client';

import { useState, useEffect, useCallback } from 'react';
import { anonymizeMessage } from '@/ai/flows/anonymize-message-flow';
import { generateAnonymousName } from '@/ai/flows/generate-anonymous-name';
import type { Message, UiSettings, ChatMessage, MessagePayload } from '@/lib/types';
import MessageList from './message-list';
import MessageInput from './message-input';
import ChatHeader from './chat-header';
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Lock } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, getDocs, where, limit, addDoc, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import * as crypto from '@/lib/crypto';
import { useRouter } from 'next/navigation';
import LoadingGhost from './loading-ghost';


const defaultSettings: UiSettings = {
  messageExpiry: 0,
  themeColor: 'default',
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  animationIntensity: 'medium',
};

// Helper to convert a File to a Data URL
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
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
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  
  // Combined loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  // Step 1: Initialize User Profile and Crypto Keys. Name is now ephemeral.
  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
        await crypto.initializeKeyPair();

        // Generate a new name every time the component mounts
        try {
          const aiName = await generateAnonymousName();
          setUserName(aiName.name);
        } catch (error) {
          console.error("Failed to generate anonymous name:", error);
          const fallbacks = ['SinfulWhisper', 'GraveLurker', 'VelvetShadow', 'CrimsonTryst', 'VoidSeeker'];
          const fallbackName = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          setUserName(fallbackName);
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
      let isPublic = false;

      if (initialRoomId.startsWith('lobby-')) {
        isPublic = true;
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
      
      const roomData = roomSnap.data();

      // If it's a private room, check the isPublic flag from the document
      if (!isPublic) {
          setIsPublicRoom(roomData?.isPublic || false);
      } else {
          setIsPublicRoom(true);
      }
      setCurrentRoomId(finalRoomId);


      const publicKeyJwk = await crypto.exportMyPublicKey();
      if (publicKeyJwk) {
          await updateDocumentNonBlocking(roomDocRef, {
              [`participants.${user.uid}`]: {
                  publicKey: publicKeyJwk,
                  name: userName,
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
  
  // Step 4: Process and decrypt messages, and handle automatic deletion.
  useEffect(() => {
    if (!firestoreMessages || !isParticipant || !user || !firestore || !currentRoomId) return; 

    const processMessages = async () => {
      const now = Date.now();
      const expirySeconds = settings.messageExpiry;

      const messagePromises = firestoreMessages.map(async (msg): Promise<Message | null> => {
        const concreteMsg = msg as ChatMessage & {id: string};

        if (expirySeconds > 0 && concreteMsg.timestamp instanceof Timestamp) {
            const messageTime = concreteMsg.timestamp.toMillis();
            if (now - messageTime > expirySeconds * 1000) {
              // Check if the current user is the sender
              if (concreteMsg.senderId === user.uid) {
                // If so, delete the message from Firestore
                const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', concreteMsg.id);
                deleteDocumentNonBlocking(messageRef);
              }
              // In either case, don't display it if it's expired
              return null;
            }
        }

        let decryptedPayload: MessagePayload;
        try {
          const userPayload = concreteMsg.payloads?.[user.uid];
          if (userPayload) {
            const decryptedString = await crypto.decrypt(userPayload);
            decryptedPayload = JSON.parse(decryptedString);
          } else {
            return null; // Not intended for this user
          }
        } catch (error) {
            console.warn("Could not decrypt or parse message payload:", error, "Message ID:", concreteMsg.id);
            return null;
        }
        
        return {
          id: concreteMsg.id,
          text: decryptedPayload.text,
          media: decryptedPayload.media,
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
  }, [firestoreMessages, settings.messageExpiry, isParticipant, user, firestore, currentRoomId]);


  const handleSendMessage = useCallback(async (rawText: string, shouldAnonymize: boolean, mediaFile?: File) => {
    if ((!rawText.trim() && !mediaFile) || isSending || !user || !userName || !currentRoomId || !firestore || !isParticipant) return;
    setIsSending(true);

    try {
      let textToSend = rawText;
      let wasAnonymized = false;

      if (shouldAnonymize && textToSend) {
          const result = await anonymizeMessage({ message: textToSend });
          textToSend = result.anonymizedMessage;
          wasAnonymized = result.anonymized;
          if (wasAnonymized) {
              toast({
                  variant: 'default',
                  title: "Message Anonymized",
                  description: "Your message was altered to protect your privacy.",
                  icon: <Sparkles className="text-accent" />,
              });
          }
      }

      const mediaDataUrl = mediaFile ? await fileToDataUrl(mediaFile) : undefined;
      const payload: MessagePayload = { text: textToSend, media: mediaDataUrl };
      const payloadString = JSON.stringify(payload);

      const roomDocRef = doc(firestore, 'chatRooms', currentRoomId);
      const roomSnapshot = await getDoc(roomDocRef);
      const participants = roomSnapshot.data()?.participants || {};
      
      if (Object.keys(participants).length === 0) {
          throw new Error("There are no participants in the room to send the message to.");
      }
      
      const encryptedPayloads: { [key: string]: string } = {};
      
      for (const uid in participants) {
        const participant = participants[uid];
        if (participant && participant.publicKey) {
          try {
            const recipientPublicKey = await crypto.importPublicKey(participant.publicKey);
            encryptedPayloads[uid] = await crypto.encrypt(payloadString, recipientPublicKey);
          } catch(e) {
            console.warn(`Could not encrypt for participant ${uid}, skipping.`, e)
          }
        }
      }

      if (Object.keys(encryptedPayloads).length === 0) {
        throw new Error("Could not encrypt message for any recipients.");
      }
      
      const newMessage: Omit<ChatMessage, 'id'> = {
        senderId: user.uid,
        senderName: userName,
        timestamp: serverTimestamp(),
        anonymized: wasAnonymized,
        isEdited: false,
        payloads: encryptedPayloads,
      };
      
      await addDocumentNonBlocking(collection(firestore, 'chatRooms', currentRoomId, 'messages'), newMessage);

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
        
        const newPayloads: { [key: string]: string } = {};
        
        // Re-encrypt for the same set of users
        const messageRef = doc(firestore, 'chatRooms', currentRoomId, 'messages', messageId);
        const messageSnap = await getDoc(messageRef);
        const originalPayloads = messageSnap.data()?.payloads || {};
        const recipients = Object.keys(originalPayloads);

        const payload: MessagePayload = { text: newText };
        const payloadString = JSON.stringify(payload);

        for (const uid of recipients) {
            if (participants[uid] && participants[uid].publicKey) {
                const recipientPublicKey = await crypto.importPublicKey(participants[uid].publicKey);
                newPayloads[uid] = await crypto.encrypt(payloadString, recipientPublicKey);
            }
        }

        await updateDocumentNonBlocking(messageRef, {
            payloads: newPayloads,
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

  if (isUserLoading || isLoading || !userName) {
    return <LoadingGhost />;
  }

  return (
    <div className={`flex flex-col h-screen bg-background animate-intensity-${settings.animationIntensity}`}>
      <ChatHeader 
        roomId={currentRoomId} 
        isPublic={isPublicRoom} 
        onSettingsChange={handleSettingsChange} 
        settings={settings} 
      />
      <div className="flex-1 overflow-hidden">
        <div className="p-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-secondary/30">
            <Lock className="h-3 w-3 text-green-500" />
            Messages are end-to-end encrypted. No one outside of this chat, not even GhostTalk, can read them.
        </div>
        <MessageList 
            messages={messages} 
            currentUserId={user?.uid || ''} 
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
