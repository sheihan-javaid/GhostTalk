
'use client';

import { Ghost, Settings, Copy, Check, Palette, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ChatSettings from './chat-settings';
import PrivacySettings from './privacy-settings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UiSettings } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface ChatHeaderProps {
  roomId: string;
  isPublic: boolean;
  onSettingsChange: (settings: Partial<UiSettings>) => void;
  settings: UiSettings;
}

export default function ChatHeader({ roomId, isPublic, onSettingsChange, settings }: ChatHeaderProps) {
  const [inviteLink, setInviteLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isAppearanceSettingsOpen, setIsAppearanceSettingsOpen] = useState(false);
  const [isPrivacySettingsOpen, setIsPrivacySettingsOpen] = useState(false);

  useEffect(() => {
    // This needs to run on the client to get the window.location
    setInviteLink(`${window.location.origin}/chat/${roomId}`);
  }, [roomId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border shadow-sm">
      <Link href="/" className="flex items-center gap-2">
        <Ghost className="h-8 w-8 text-accent" />
        <h1 className="text-2xl font-bold text-foreground hidden sm:block font-headline">GhostTalk</h1>
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        
        {isPublic && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Info className="h-4 w-4" />
                  <span>Public Lobby</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">This is a public lobby. In very large rooms, not all participants may receive every message to ensure performance.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!isPublic && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-secondary">
            <span className="text-sm text-muted-foreground hidden md:inline">Invite:</span>
            <input type="text" readOnly value={inviteLink} className="text-sm bg-transparent w-32 md:w-48 text-foreground truncate" />
            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(inviteLink)} className="h-8 w-8 shrink-0">
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-accent" />}
              <span className="sr-only">Copy invite link</span>
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Chat Settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsAppearanceSettingsOpen(true)}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Appearance</span>
            </DropdownMenuItem>
             <DropdownMenuItem onSelect={() => setIsPrivacySettingsOpen(true)}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Privacy</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ChatSettings 
            isOpen={isAppearanceSettingsOpen} 
            onOpenChange={setIsAppearanceSettingsOpen} 
            onSettingsChange={onSettingsChange} 
            currentSettings={settings}
        />

        <PrivacySettings
            isOpen={isPrivacySettingsOpen}
            onOpenChange={setIsPrivacySettingsOpen}
            onSettingsChange={onSettingsChange}
            currentSettings={settings}
        />

      </div>
    </header>
  );
}

