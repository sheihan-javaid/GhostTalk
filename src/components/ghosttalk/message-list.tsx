import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Shield, User, Paperclip, Download, File as FileIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  showUsername: boolean;
}

function MessageItem({ message, isCurrentUser, showUsername }: { message: Message, isCurrentUser: boolean, showUsername: boolean }) {
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-primary text-primary-foreground'
    : 'bg-secondary text-secondary-foreground';
  
  const formattedTime = message.timestamp instanceof Timestamp 
    ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={cn(
        'flex w-full flex-col gap-2', 
        alignClass, 
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 duration-500'
      )}
    >
      {showUsername && (
        <div className="flex items-center gap-2">
          {!isCurrentUser && (
              <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      <User className="h-4 w-4"/>
                  </AvatarFallback>
              </Avatar>
          )}
          <span className="text-xs text-muted-foreground">{!isCurrentUser ? message.username : 'You'}</span>
        </div>
      )}
      <div className={cn(
          "max-w-xs md:max-w-md lg:max-w-2xl p-3 shadow-md transform transition-all duration-300 rounded-[var(--bubble-radius)]", 
          bubbleClass,
          isCurrentUser ? 'rounded-br-none motion-safe:hover:-translate-x-1' : 'rounded-bl-none motion-safe:hover:translate-x-1'
        )}
      >
        {message.text && <p className="text-sm break-words">{message.text}</p>}
        {message.file && (
          <div className="mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left h-auto p-2 bg-background/20 hover:bg-background/40">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">{message.file.name}</span>
                       <span className="text-xs text-muted-foreground">Click to view</span>
                    </div>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{message.file.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 flex items-center justify-center bg-muted/50 rounded-lg p-4 max-h-[70vh]">
                  {message.file.type.startsWith('image/') ? (
                    <img src={message.file.data} alt={message.file.name} className="max-w-full max-h-full object-contain h-auto rounded-md" />
                  ) : message.file.type.startsWith('video/') ? (
                    <video controls src={message.file.data} className="max-w-full max-h-full object-contain h-auto rounded-md" />
                  ) : message.file.type.startsWith('audio/') ? (
                    <audio controls src={message.file.data} className="w-full" />
                  ) : (
                    <div className="p-4 bg-muted rounded-md text-center flex flex-col items-center gap-4">
                      <FileIcon className="h-16 w-16 text-muted-foreground"/>
                      <p>Unsupported file type for preview.</p>
                       <a href={message.file.data} download={message.file.name}>
                        <Button className="mt-4">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formattedTime}</span>
        {message.anonymized && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="h-3 w-3 text-accent" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This message was anonymized by AI.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        )}
      </div>
    </div>
  );
}


export default function MessageList({ messages, currentUserId, showUsername }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure the scroll happens after the DOM is fully updated
      setTimeout(() => {
        if(scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="h-full space-y-6 overflow-y-auto p-4">
      {messages.map(message => (
        <MessageItem
          key={message.id}
          message={message}
          isCurrentUser={message.userId === currentUserId}
          showUsername={showUsername}
        />
      ))}
    </div>
  );
}
