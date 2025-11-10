'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ghostChat, getGhostAIGreeting } from '@/ai/flows/ghost-chat';
import { Loader2, Bot, User, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


export default function GhostAiChat() {
    const [history, setHistory] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchGreeting() {
            try {
                const greeting = await getGhostAIGreeting();
                setHistory([{ role: 'model', content: [{ text: greeting }] }]);
            } catch (error) {
                console.error("Could not fetch greeting:", error);
                setHistory([{ role: 'model', content: [{ text: "Hello! How can I help you?"}] }]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGreeting();
    }, []);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, isLoading]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const currentUserMessage = { role: 'user', content: [{ text: input }] };
        const newHistory = [...history, currentUserMessage];
        
        setHistory(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const response = await ghostChat(newHistory);
            setHistory(prev => [...prev, { role: 'model', content: [{ text: response }] }]);
        } catch (error) {
            console.error("Ghost AI Error:", error);
            setHistory(prev => [...prev, { role: 'model', content: [{ text: "Sorry, I've encountered an error." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    const getMessageText = (msg: any) => {
        if (msg.content[0] && 'text' in msg.content[0]) {
            return msg.content[0].text;
        }
        return '';
    }

    return (
        <div className="w-full max-w-2xl flex flex-col h-[90vh] bg-secondary/30 rounded-lg border border-border shadow-2xl shadow-primary/10">
            <div className="p-4 border-b border-border text-center">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2 font-headline"><Bot className="h-8 w-8 text-accent"/> Ghost AI</h1>
                <p className="text-muted-foreground text-sm">Your private, ephemeral AI assistant.</p>
            </div>
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-6">
                    {history.map((msg, index) => (
                        <div 
                            key={index} 
                            className={cn(
                                'flex items-end gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500', 
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {msg.role === 'model' && (
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'p-3 rounded-2xl max-w-md lg:max-w-lg shadow-md', 
                                msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground rounded-br-none' 
                                    : 'bg-background rounded-bl-none'
                            )}>
                                <p className="text-sm whitespace-pre-wrap">{getMessageText(msg)}</p>
                            </div>
                            {msg.role === 'user' && (
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-muted text-muted-foreground"><User className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && history.length > 0 && (
                          <div className="flex items-end gap-3 justify-start animate-in fade-in-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            <div className="p-3 rounded-2xl bg-background rounded-bl-none flex items-center gap-2 shadow-md">
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-200"></span>
                                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-400"></span>
                            </div>
                          </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm rounded-b-lg">
                <div className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Ask GhostAI anything..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send message</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
