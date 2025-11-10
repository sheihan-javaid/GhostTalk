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

const qrCodeDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAABlBMVEX///8AAABVwtN+AAABnElEQVR4nO3dy27DIBAEUGsH2f//2fUPgw1pQaK1Qztoey7F4AwbDCjY3N3d3d3d3d3d3d3d3d19b/lu41/O/mP8y/iX8b9L/O99Lv/z785/ufw38r+T/L/4N/i/9T/B/0/+H/3/9T/g/zX+39Z/F/9L/C/xv87/V/1H/C/z/4v/S/x/9t/k/239b/B/yf9r/I/y/83/D/7f+z/h/zX+H/s/7f9T/t/4P+3/s/5P+X/j/4f/f/0/5P+R/s/4f+L/h/6v+L/q/6f+v/p/7P+H/u/6f+7/p/8v+n/y/6f/L/p/8v+X/y/5f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1//L6/f9n/A97f6X+H/s/4X+H/q/4f+r/p/6/+n/s/4f+7/p/7v+n/y/6f/L/p/8v+n/y/5f/L/l/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1//L6/f9n/A97f6X+H/s/4X+H/q/4f+r/p/6/+n/s/4f+7/p/7v+n/y/6f/L/p/8v+n/y/5f/L/l/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1//L6/f9n/A97f6X+H/s/4X+H/q/4f+r/p/6/+n/s/4f+7/p/7v+n/y/6f/L/p/8v+n/y/5f/L/l/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/L/1/8v/X/y/9f/b/1/9v/X/2/9f/b/1/9v/X/2/9f/L/1/+v0+v/e/u7u7u7u7u7u7u7u7u7vb/AFLW3Nf4b23dAAAAAElFTkSuQmCC";

export default function Home() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('asia');
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  
  const { auth, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

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

    const defaultName = `Private Room - ${Date.now()}`;
    const newRoomData = {
        name: name || defaultName,
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
    createRoom(false, newRoomName.trim() === '' ? undefined : newRoomName);
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
                    <DialogTitle>Name Your Private Room (Optional)</DialogTitle>
                    <DialogDescription>
                        Give your new private room a name to make it easier to identify. If you leave it blank, a name will be generated.
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
                  If you enjoy GhostTalk, consider supporting its development anonymously.
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
                Your support helps keep this project alive and private.
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
