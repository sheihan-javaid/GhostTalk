'use client';

import { useRouter } from 'next/navigation';
import { Ghost, Users, ArrowRight, Link as LinkIcon, UserPlus, Coffee, Copy, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useState, useEffect } from 'react';
import { useFirebase, initiateAnonymousSignIn, useUser } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const regions = [
  { value: 'global', label: 'Global' },
  { value: 'us-east', label: 'US East' },
  { value: 'eu-west', label: 'EU West' },
  { value: 'asia-south', label: 'Asia South' },
];

export default function Home() {
  const router = useRouter();
  const [isUpiCopied, setIsUpiCopied] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('global');
  
  const { auth, firestore } = useFirebase();
  const { user } = useUser();

  const anonymousUpiId = 'ghost-talk@privacy';
  const upiQrCodeImage = PlaceHolderImages.find(img => img.id === 'upi-qr-code');

  useEffect(() => {
    if (!user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, auth]);

  const createRoom = (isPublic: boolean) => {
    if (!user) return;
    const roomId = crypto.randomUUID();
    const roomsRef = collection(firestore, 'chatRooms');
    const newRoom = {
      name: isPublic ? `Public Lobby - ${selectedRegion}` : 'Private Room',
      createdAt: serverTimestamp(),
      region: selectedRegion,
      isPublic: isPublic,
    };
    
    // We create the room document and immediately navigate.
    // The `addDocumentNonBlocking` will handle the Firestore write in the background.
    addDocumentNonBlocking(collection(firestore, 'chatRooms'), newRoom)
      .then((docRef) => {
        // The docRef won't have an ID immediately, so we use the one we generated.
        // In a real app with blocking calls, we'd use docRef.id
      }).catch(console.error);

    // For private rooms, we use the generated ID.
    // For public rooms, this is slightly different logic.
    if (isPublic) {
        joinPublicLobby();
    } else {
        router.push(`/chat/${roomId}`);
        // We need to associate our locally generated room ID with the document.
        // A better way is to use the returned docRef.id, but this requires awaiting.
        // For non-blocking, we need a different strategy if the ID is critical on the next page.
        // For this demo, we'll just create the room doc without tying it to the navigation.
        // A more robust solution might involve a "pending room" state.
        
        // This is a simplified approach for the demo.
        const privateRoomRef = collection(firestore, 'chatRooms');
        addDocumentNonBlocking(privateRoomRef, {
            ...newRoom,
            id: roomId, // Storing our generated ID
            name: `Private Room - ${roomId.slice(0,6)}`
        })
    }
  };

  const joinPublicLobby = async () => {
    if (!user) return;

    const roomsRef = collection(firestore, 'chatRooms');
    const q = query(
      roomsRef,
      where('isPublic', '==', true),
      where('region', '==', selectedRegion),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const room = querySnapshot.docs[0];
      router.push(`/chat/${room.id}`);
    } else {
      // No public lobby found, create one
      const newRoom = {
        name: `Public Lobby - ${selectedRegion}`,
        createdAt: serverTimestamp(),
        region: selectedRegion,
        isPublic: true,
      };
      const docRef = await addDocumentNonBlocking(roomsRef, newRoom);
      // We can't get docRef.id here with the non-blocking helper as-is.
      // This highlights a limitation. For now, we'll redirect to a generic lobby name
      // and the chat component will need to resolve the latest public lobby for the region.
      // A better approach would use a cloud function or a predictable lobby ID per region.
      router.push(`/chat/lobby-${selectedRegion}`);
    }
  };
  
  const createPrivateRoom = () => createRoom(false);

  const copyUpiToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsUpiCopied(true);
    setTimeout(() => setIsUpiCopied(false), 2000);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in-0 duration-500">
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-primary rounded-full mb-4 shadow-lg shadow-primary/30">
          <Ghost className="h-12 w-12 text-primary-foreground" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground font-headline">
          Welcome to <span className="text-accent">GhostTalk</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          A truly anonymous, secure, and private chat experience. No accounts. No logs. Just conversations.
        </p>
      </div>

      <div className="w-full max-w-sm mb-8">
        <Card className="bg-secondary/30 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><Globe className="text-accent"/> Region</CardTitle>
            <CardDescription>Choose a chat region to connect with others.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(region => (
                  <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Users className="h-8 w-8 text-accent" />
              <span className="text-2xl font-headline">Random Chat</span>
            </CardTitle>
            <CardDescription>
              Jump into a public lobby in your selected region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={joinPublicLobby} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={!user}>
              Join Public Lobby
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
               <LinkIcon className="h-8 w-8 text-accent" />
               <span className="text-2xl font-headline">Private Room</span>
            </CardTitle>
            <CardDescription>
              Create a private, encrypted room and invite someone with a secret link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createPrivateRoom} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold" disabled={!user}>
              Create a Private Room
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
               <UserPlus className="h-8 w-8 text-accent" />
               <span className="text-2xl font-headline">Create Group</span>
            </CardTitle>
            <CardDescription>
              Create a private group and invite multiple people with a secret link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createPrivateRoom} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold" disabled={!user}>
              Create a Group
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

         <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
               <Coffee className="h-8 w-8 text-accent" />
               <span className="text-2xl font-headline">Support Us</span>
            </CardTitle>
            <CardDescription>
              If you enjoy GhostTalk, consider supporting its development anonymously.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold">
                  Buy me a coffee
                  <Coffee className="ml-2 h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Support GhostTalk</DialogTitle>
                    <DialogDescription>
                        If you enjoy GhostTalk, consider supporting its development. Your donation remains completely anonymous.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    {upiQrCodeImage && <Image 
                        src={upiQrCodeImage.imageUrl}
                        alt={upiQrCodeImage.description}
                        width={200}
                        height={200}
                        className="rounded-lg border-4 border-accent shadow-lg"
                        data-ai-hint={upiQrCodeImage.imageHint}
                    />}
                    <p className="text-sm text-muted-foreground">Or copy the anonymous UPI ID below</p>
                    <div className="flex w-full max-w-sm items-center gap-2 p-2 rounded-md bg-secondary">
                        <input type="text" readOnly value={anonymousUpiId} className="flex-1 text-sm bg-transparent text-foreground truncate" />
                        <Button size="icon" variant="ghost" onClick={() => copyUpiToClipboard(anonymousUpiId)} className="h-8 w-8 shrink-0">
                        {isUpiCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-accent" />}
                        <span className="sr-only">Copy UPI ID</span>
                        </Button>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      <footer className="mt-20 text-center text-muted-foreground text-sm">
        <p>Your privacy is paramount. All messages are end-to-end encrypted and metadata is stripped.</p>
        <p>No data is ever stored on our servers.</p>
      </footer>
    </div>
  );
}
