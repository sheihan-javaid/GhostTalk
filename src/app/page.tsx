'use client';

import { useRouter } from 'next/navigation';
import { Ghost, Users, ArrowRight, Link as LinkIcon, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = crypto.randomUUID();
    router.push(`/chat/${roomId}`);
  };

  const joinRandomRoom = () => {
    // For this scaffold, we'll use a predefined "random" room.
    // A real implementation would require a backend for matchmaking.
    router.push(`/chat/random-lobby`);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        <Card className="border-2 border-transparent hover:border-accent transition-all duration-300 transform hover:-translate-y-1 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Users className="h-8 w-8 text-accent" />
              <span className="text-2xl font-headline">Random Chat</span>
            </CardTitle>
            <CardDescription>
              Jump into a conversation with a random stranger. Rooms are ephemeral and anonymous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={joinRandomRoom} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              Join a Random Chat
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
            <Button onClick={createRoom} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold">
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
            <Button onClick={createRoom} variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground font-semibold">
              Create a Group
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
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
