'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (text: string, shouldAnonymize: boolean, file?: File) => void;
  isSending: boolean;
}

export default function MessageInput({ onSendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState('');
  const [shouldAnonymize, setShouldAnonymize] = useState(true);
  const [file, setFile] = useState<File | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    onSendMessage(text, shouldAnonymize, file);
    setText('');
    setFile(undefined);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
       {file && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
            </div>
            <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                    setFile(undefined);
                    if(fileInputRef.current) {
                        fileInputRef.current.value = "";
                    }
                }}
            >
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
        placeholder="Type your secret message..."
        className="resize-none max-h-40 overflow-y-auto"
        rows={1}
        disabled={isSending}
      />
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                        <Switch
                            id="anonymize-switch"
                            checked={shouldAnonymize}
                            onCheckedChange={setShouldAnonymize}
                            disabled={isSending}
                            aria-label="Toggle AI Anonymizer"
                        />
                        <Label htmlFor="anonymize-switch" className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
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

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                          <Paperclip />
                          <span className="sr-only">Attach file</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Share a file (max 5MB).</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
        </div>

        <Button type="submit" disabled={isSending || (!text.trim() && !file)} className="font-semibold">
          {isSending ? 'Sending...' : 'Send'}
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
