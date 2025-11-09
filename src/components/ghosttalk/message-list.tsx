import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Shield, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

function MessageItem({ message, isCurrentUser }: { message: Message, isCurrentUser: boolean }) {
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-primary text-primary-foreground rounded-br-none'
    : 'bg-secondary text-secondary-foreground rounded-bl-none';
  
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full flex-col gap-2 ${alignClass} animate-in fade-in-0 slide-in-from-bottom-4 duration-300`}>
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
      <div className={cn("max-w-xs md:max-w-md lg:max-w-2xl p-3 rounded-xl shadow-md", bubbleClass)}>
        <p className="text-sm break-words">{message.text}</p>
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


export default function MessageList({ messages, currentUserId }: MessageListProps) {
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
    <div ref={scrollRef} className="h-full space-y-6 overflow-y-auto px-4">
      {messages.map(message => (
        <MessageItem
          key={message.id}
          message={message}
          isCurrentUser={message.userId === currentUserId}
        />
      ))}
    </div>
  );
}
