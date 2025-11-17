
'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Send, Sparkles, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


interface MessageInputProps {
  onSendMessage: (text: string, shouldAnonymize: boolean, media?: File) => void;
  isSending: boolean;
}

export default function MessageInput({ onSendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState('');
  const [shouldAnonymize, setShouldAnonymize] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'Error', description: 'File size cannot exceed 2MB.' });
        return;
      }
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaFile) return;
    onSendMessage(text, shouldAnonymize, mediaFile || undefined);
    setText('');
    removeMedia();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {mediaPreview && (
        <div className="relative w-48 h-48 mx-auto">
          <Image
            src={mediaPreview}
            alt="Media preview"
            layout="fill"
            className="rounded-md object-cover"
          />
          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={removeMedia} disabled={isSending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder={isSending ? "Joining room..." : "Type your secret message..."}
        className="resize-none max-h-40 overflow-y-auto"
        rows={1}
        disabled={isSending}
      />
      <div className="flex justify-between items-center">
        <div className='flex items-center gap-1'>
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                        <Paperclip />
                        <span className="sr-only">Attach media</span>
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Attach an image (max 2MB)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                <div
                    className={cn(
                    "flex items-center space-x-2 cursor-pointer transition-all duration-300 rounded-lg p-1",
                    shouldAnonymize && "shadow-[0_0_15px_-3px_hsl(var(--accent))]"
                    )}
                >
                    <Switch
                    id="anonymize-switch"
                    checked={shouldAnonymize}
                    onCheckedChange={setShouldAnonymize}
                    disabled={isSending}
                    aria-label="Toggle AI Anonymizer"
                    />
                    <Label
                    htmlFor="anonymize-switch"
                    className={cn(
                        "flex items-center gap-1.5 text-muted-foreground cursor-pointer transition-colors",
                        shouldAnonymize && "text-accent"
                    )}
                    >
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span>AI Anonymizer</span>
                    </Label>
                </div>
                </TooltipTrigger>
                <TooltipContent>
                <p>Use AI to strip personal data from your message before sending.</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>
        </div>


        <Button type="submit" disabled={isSending || (!text.trim() && !mediaFile)} className="font-semibold">
          {isSending ? 'Sending...' : 'Send'}
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
