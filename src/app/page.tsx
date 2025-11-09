'use client';

import { useRouter } from 'next/navigation';
import { Ghost, Users, ArrowRight, Link as LinkIcon, UserPlus, Coffee, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useFirebase, initiateAnonymousSignIn, useUser } from '@/firebase';
import { collection, serverTimestamp, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const regions = [
  { value: 'north-america', label: 'North America' },
  { value: 'south-america', label: 'South America' },
  { value: 'europe', label: 'Europe' },
  { value: 'africa', label: 'Africa' },
  { value: 'asia', label: 'Asia' },
  { value: 'oceania', label: 'Oceania' },
];

export default function Home() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('north-america');
  
  const { auth, firestore } = useFirebase();
  const { user } = useUser();
  const upiQrCodeImage = PlaceHolderImages.find(img => img.id === 'upi-qr-code');


  useEffect(() => {
    if (!user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, auth]);

  const createRoom = async (isPublic: boolean, isGroup: boolean) => {
    if (!user || !firestore) return;

    if (isPublic) {
        await joinPublicLobby();
        return;
    }

    const newRoomData = {
        name: isGroup ? `Private Group` : `Private Room`,
        createdAt: serverTimestamp(),
        region: selectedRegion,
        isPublic: false,
    };

    try {
        const roomsRef = collection(firestore, 'chatRooms');
        const docRef = await addDoc(roomsRef, newRoomData);
        router.push(`/chat/${docRef.id}`);
    } catch (error) {
        console.error("Error creating private room/group:", error);
    }
  };

  const joinPublicLobby = async () => {
    if (!user || !firestore) return;

    const roomsRef = collection(firestore, 'chatRooms');
    const q = query(
      roomsRef,
      where('isPublic', '==', true),
      where('region', '==', selectedRegion),
      // orderBy('createdAt', 'desc'), // This line requires a composite index
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const room = querySnapshot.docs[0];
      router.push(`/chat/${room.id}`);
    } else {
      const newRoom = {
        name: `Public Lobby - ${regions.find(r => r.value === selectedRegion)?.label || selectedRegion}`,
        createdAt: serverTimestamp(),
        region: selectedRegion,
        isPublic: true,
      };
      try {
        const docRef = await addDoc(roomsRef, newRoom);
        router.push(`/chat/${docRef.id}`);
      } catch (error) {
        console.error("Error creating public lobby:", error);
      }
    }
  };
  
  const createPrivateRoom = () => createRoom(false, false);
  const createGroup = () => createRoom(false, true);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in-0 duration-500">
      
      <div className="text-center mb-8">
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

      <div className="w-full max-w-sm mb-12">
        <Card className="bg-secondary/30 border-border">
          <CardContent className="p-3">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full border-0 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-2">
                    <Globe className="text-accent h-4 w-4"/>
                    <SelectValue placeholder="Select a region" />
                </div>
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
            <Button onClick={createGroup} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold" disabled={!user}>
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
                        data-ai-hint={upiQrCodeImage.imageHint}
                        className="rounded-md"
                    />}
                    <p className="text-sm text-muted-foreground">You can support us anonymously via the link below:</p>
                    <a 
                        href="https://razorpay.me/@mohammadsheihanjavaid"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-accent underline hover:text-accent/80"
                    >
                        ghost-talk@privacy
                    </a>
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
