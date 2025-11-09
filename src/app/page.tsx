

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

    
    