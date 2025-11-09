'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import * as crypto from '@/lib/crypto';


export default function WhisperPage() {
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const [whisperLink, setWhisperLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const createWhisperRoom = async () => {
    if (!user || !firestore) return;
    setIsCreating(true);

    const newRoomData = {
      name: `Whisper Room - ${Date.now()}`,
      createdAt: serverTimestamp(),
      region: 'global',
      isPublic: false,
      isWhisper: true,
      participants: {},
    };

    try {
      // 1. Create the room document
      const docRef = await addDocumentNonBlocking(collection(firestore, 'chatRooms'), newRoomData);
      if (docRef) {
        // 2. Add self as a participant
        const publicKeyJwk = await crypto.exportMyPublicKey();
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const userName = userDoc.data()?.anonymousName || 'Anonymous';

        if (publicKeyJwk) {
          // This update is non-blocking in terms of UI, but we await it here to ensure the creator is in before generating the link.
          await updateDoc(docRef, {
            [`participants.${user.uid}`]: {
              publicKey: publicKeyJwk,
              name: userName,
            },
          });
        }
        
        // 3. Only now, set the link
        setWhisperLink(`${window.location.origin}/chat/${docRef.id}`);
      }
    } catch (error) {
      console.error("Whisper room creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create Whisper Room.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (!whisperLink) return;
    navigator.clipboard.writeText(whisperLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: 'Link Copied!', description: 'You can now share the link with someone.' });
  };
  
  const joinChat = () => {
    if (whisperLink) {
        const roomId = whisperLink.split('/').pop();
        router.push(`/chat/${roomId}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
       <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-accent" />
            Whisper Mode
          </CardTitle>
          <CardDescription>
            Create a temporary, end-to-end encrypted 1-on-1 chat room. The room is deleted when the last person leaves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!whisperLink ? (
            <Button onClick={createWhisperRoom} disabled={isCreating || !user} className="w-full">
              {isCreating ? <Loader2 className="animate-spin" /> : 'Generate Secure Link'}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share this secure link with one other person:</p>
              <div className="flex items-center gap-2">
                <Input type="text" readOnly value={whisperLink} />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={joinChat} className="w-full">Join Chat</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
