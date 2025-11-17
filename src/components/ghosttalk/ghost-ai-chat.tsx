'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ghostChat, getGhostAIGreeting } from '@/ai/flows/ghost-chat';
import { Loader2, Bot, User, Send, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';


const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return !inline && match ? (
        <div className="relative bg-background/50 my-2 rounded-lg border">
             <div className="flex items-center justify-between px-4 py-1 border-b">
                <span className="text-xs text-muted-foreground">{match[1]}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <SyntaxHighlighter
                style={atomOneDark}
                language={match[1]}
                PreTag="div"
                {...props}
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    ) : (
        <code className={cn("bg-muted/50 text-accent font-mono rounded px-1 py-0.5", className)} {...props}>
            {children}
        </code>
    );
};


export default function GhostAiChat() {
    const [history, setHistory] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollAreaViewport = useRef<HTMLDivElement>(null);

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
        if (scrollAreaViewport.current) {
            scrollAreaViewport.current.scrollTo({ top: scrollAreaViewport.current.scrollHeight, behavior: 'smooth' });
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
            <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaViewport}>
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
                                <div className="text-sm prose prose-sm prose-invert max-w-none">
                                    <ReactMarkdown
                                        components={{ code: CodeBlock }}
                                    >
                                        {getMessageText(msg)}
                                    </ReactMarkdown>
                                </div>
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
                        placeholder="Whisper to the void..."
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
