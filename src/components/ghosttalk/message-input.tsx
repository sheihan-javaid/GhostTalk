
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (text: string, shouldAnonymize: boolean) => void;
  isSending: boolean;
}

export default function MessageInput({ onSendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState('');
  const [shouldAnonymize, setShouldAnonymize] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text, shouldAnonymize);
    setText('');
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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

        <Button type="submit" disabled={isSending || !text.trim()} className="font-semibold">
          {isSending ? 'Sending...' : 'Send'}
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
