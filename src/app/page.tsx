'use client';

import { useRouter } from 'next/navigation';
import { Ghost, Users, ArrowRight, Link as LinkIcon, Coffee, Globe, Zap, MessageSquareQuote, BarChart, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useFirebase, initiateAnonymousSignIn, useUser } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';

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
  const [selectedRegion, setSelectedRegion] = useState('asia');
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  
  const { auth, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const qrCodeDataUrl = "data:image/png;base64,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";

  useEffect(() => {
    if (!user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, auth]);

  const createRoom = async (isPublic: boolean, name?: string) => {
    if (!user || !firestore) return;

    if (isPublic) {
        await joinPublicLobby();
        return;
    }

    const newRoomData = {
        name: name || `Private Room`,
        createdAt: serverTimestamp(),
        region: selectedRegion,
        isPublic: false,
        participants: {},
    };

    const roomsRef = collection(firestore, 'chatRooms');
    addDocumentNonBlocking(roomsRef, newRoomData)
      .then(docRef => {
        if (docRef) {
          router.push(`/chat/${docRef.id}`);
        }
      })
      .catch(() => {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not create private room.",
        });
      });
  };

  const joinPublicLobby = async () => {
    if (!user || !firestore) return;
    router.push(`/chat/lobby-${selectedRegion}`);
  };
  
  const handleCreatePrivateRoom = () => {
    createRoom(false, newRoomName.trim() === '' ? 'Private Room' : newRoomName);
    setIsCreateRoomDialogOpen(false);
    setNewRoomName('');
  };

  const handleLoungeFeatureClick = (featurePath: string) => {
    router.push(`/lounge/${featurePath}`);
  }
  
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
            <Button onClick={joinPublicLobby} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold" disabled={!user}>
              Join Public Lobby
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isCreateRoomDialogOpen} onOpenChange={setIsCreateRoomDialogOpen}>
            <DialogTrigger asChild>
                <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50 cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                        <LinkIcon className="h-8 w-8 text-accent" />
                        <span className="text-2xl font-headline">Private Room</span>
                        </CardTitle>
                        <CardDescription>
                        Create a private room and invite someone with a secret link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold" disabled={!user}>
                            Create a Private Room
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Name Your Private Room</DialogTitle>
                    <DialogDescription>
                        Give your new private room a name to make it easier to identify.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="room-name" className="text-right">
                        Name
                        </Label>
                        <Input
                        id="room-name"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="e.g., Project Phoenix"
                        className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreatePrivateRoom} disabled={!user}>Create Room</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog>
          <DialogTrigger asChild>
            <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Ghost className="h-8 w-8 text-accent" />
                  <span className="text-2xl font-headline">Ghost Lounge</span>
                </CardTitle>
                <CardDescription>
                  Explore experimental, privacy-focused chat modes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold">
                  Enter the Lounge
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Ghost className="h-8 w-8 text-accent" />
                Ghost Lounge
              </DialogTitle>
              <DialogDescription>
                Explore experimental, privacy-focused chat modes. More features coming soon!
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <Button variant="outline" className="h-24 flex-col gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleLoungeFeatureClick('whisper')}>
                <Zap className="h-6 w-6"/>
                <span className="font-semibold">Whisper Mode</span>
                <p className="text-xs font-normal text-muted-foreground">Ephemeral 1:1 chat</p>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleLoungeFeatureClick('confession')}>
                <MessageSquareQuote className="h-6 w-6"/>
                <span className="font-semibold">Confession Wall</span>
                 <p className="text-xs font-normal text-muted-foreground">Public anonymous board</p>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleLoungeFeatureClick('poll')}>
                <BarChart className="h-6 w-6"/>
                <span className="font-semibold">Anonymous Poll</span>
                <p className="text-xs font-normal text-muted-foreground">Get anonymous opinions</p>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleLoungeFeatureClick('ghost-ai')}>
                <Bot className="h-6 w-6"/>
                <span className="font-semibold">Ghost AI</span>
                <p className="text-xs font-normal text-muted-foreground">Privacy-first chatbot</p>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
            <DialogTrigger asChild>
                <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50 cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                        <Coffee className="h-8 w-8 text-accent" />
                        <span className="text-2xl font-headline">Support Us</span>
                        </CardTitle>
                        <CardDescription>
                        If you enjoy GhostTalk, consider supporting its development.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold">
                            Buy me a coffee
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Support GhostTalk</DialogTitle>
                    <DialogDescription>
                    Your support helps keep this service running. All donations are anonymous.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative w-48 h-48 bg-white rounded-lg p-2">
                         <Image
                            src={qrCodeDataUrl}
                            alt="BHIM UPI QR Code for mohammadsheihanjavaid"
                            width={192}
                            height={192}
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">Scan to donate anonymously</p>
                    <p className="text-sm text-muted-foreground">or pay using the link below</p>
                    <a
                        href="https://razorpay.me/@mohammadsheihanjavaid"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-accent underline hover:text-accent/80 text-center break-all text-sm"
                    >
                        ghost-talk@privacy
                    </a>
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <footer className="mt-20 text-center text-muted-foreground text-sm">
        <p>Your privacy is paramount. All messages are end-to-end encrypted and metadata is stripped.</p>
        <p>No data is ever stored on our servers.</p>
      </footer>
    </div>
  );

}
