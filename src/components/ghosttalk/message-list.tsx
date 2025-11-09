import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Shield, User, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timestamp } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '../ui/textarea';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  showUsername: boolean;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
}

function MessageItem({ message, isCurrentUser, showUsername, onDeleteMessage, onEditMessage }: { message: Message, isCurrentUser: boolean, showUsername: boolean, onDeleteMessage: (id: string) => void, onEditMessage: (id: string, text: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-primary text-primary-foreground'
    : 'bg-secondary text-secondary-foreground';
  
  const formattedTime = message.timestamp instanceof Timestamp 
    ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEditMessage(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  }

  const messageContent = isEditing ? (
    <div className="w-full max-w-xs md:max-w-md lg:max-w-2xl">
        <Textarea 
            value={editText} 
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm bg-background text-foreground"
            rows={3}
        />
        <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
        </div>
    </div>
  ) : (
    <div className={cn(
        "max-w-xs md:max-w-md lg:max-w-2xl p-3 shadow-md transform transition-all duration-300 rounded-[var(--bubble-radius)] relative group", 
        bubbleClass,
        isCurrentUser ? 'rounded-br-none motion-safe:hover:-translate-x-1' : 'rounded-bl-none motion-safe:hover:translate-x-1'
      )}
    >
      <p className="text-sm break-words">{message.text}</p>
      {isCurrentUser && (
        <div className="absolute top-0 right-0 m-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDeleteMessage(message.id)} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={cn(
        'flex w-full flex-col gap-1', 
        alignClass, 
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 duration-500'
      )}
    >
      {showUsername && (
        <div className="flex items-center gap-2 px-1">
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
      {messageContent}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <span>{formattedTime}</span>
        {message.isEdited && <span>(edited)</span>}
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


export default function MessageList({ messages, currentUserId, showUsername, onDeleteMessage, onEditMessage }: MessageListProps) {
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
          onDeleteMessage={onDeleteMessage}
          onEditMessage={onEditMessage}
        />
      ))}
    </div>
  );
}
