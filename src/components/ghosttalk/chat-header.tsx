'use client';

import { Ghost, Settings, Copy, Check, Palette, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ChatSettings from './chat-settings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UiSettings } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

interface ChatHeaderProps {
  roomId: string;
  onSettingsChange: (settings: Partial<UiSettings>) => void;
  settings: UiSettings;
}

export default function ChatHeader({ roomId, onSettingsChange, settings }: ChatHeaderProps) {
  const [inviteLink, setInviteLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isUpiCopied, setIsUpiCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const anonymousUpiId = 'ghost-talk@privacy';

  useEffect(() => {
    // This needs to run on the client to get the window.location
    setInviteLink(`${window.location.origin}/chat/${roomId}`);
  }, [roomId]);

  const copyToClipboard = (text: string, type: 'link' | 'upi') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      setIsUpiCopied(true);
      setTimeout(() => setIsUpiCopied(false), 2000);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border shadow-sm">
      <Link href="/" className="flex items-center gap-2">
        <Ghost className="h-8 w-8 text-accent" />
        <h1 className="text-2xl font-bold text-foreground hidden sm:block font-headline">GhostTalk</h1>
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        {roomId !== 'random-lobby' && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-secondary">
            <span className="text-sm text-muted-foreground hidden md:inline">Invite:</span>
            <input type="text" readOnly value={inviteLink} className="text-sm bg-transparent w-32 md:w-48 text-foreground truncate" />
            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(inviteLink, 'link')} className="h-8 w-8 shrink-0">
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-accent" />}
              <span className="sr-only">Copy invite link</span>
            </Button>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
                <Coffee className="h-5 w-5" />
                <span className="sr-only">Buy me a coffee</span>
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
                <Image 
                    src="https://placehold.co/200x200/212121/BE29EC?text=Scan+Me" 
                    alt="Anonymous UPI QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg border-4 border-accent shadow-lg"
                    data-ai-hint="qr code"
                />
                <p className="text-sm text-muted-foreground">Or copy the anonymous UPI ID below</p>
                 <div className="flex w-full max-w-sm items-center gap-2 p-2 rounded-md bg-secondary">
                    <input type="text" readOnly value={anonymousUpiId} className="flex-1 text-sm bg-transparent text-foreground truncate" />
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(anonymousUpiId, 'upi')} className="h-8 w-8 shrink-0">
                    {isUpiCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-accent" />}
                    <span className="sr-only">Copy UPI ID</span>
                    </Button>
                </div>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Chat Settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Appearance</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ChatSettings 
            isOpen={isSettingsOpen} 
            onOpenChange={setIsSettingsOpen} 
            onSettingsChange={onSettingsChange} 
            currentSettings={settings}
        />

      </div>
    </header>
  );
}
