'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ghostChat, getGhostAIGreeting } from '@/ai/flows/ghost-chat';
import { Loader2, Bot, User } from 'lucide-react';
import Link from 'next/link';
import { MessageData } from 'genkit/ai';


export default function GhostAiChat() {
    const [history, setHistory] = useState<MessageData[]>([]);
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

        const currentUserMessage: MessageData = { role: 'user', content: [{ text: input }] };
        const newHistory: MessageData[] = [...history, currentUserMessage];
        
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

    const getMessageText = (msg: MessageData) => {
        if (msg.content[0] && 'text' in msg.content[0]) {
            return msg.content[0].text;
        }
        return '';
    }

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
             <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
            <div className="text-center my-4">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2"><Bot className="h-8 w-8 text-accent"/> Ghost AI</h1>
                <p className="text-muted-foreground">A private, ephemeral chatbot. Your conversation is not stored.</p>
            </div>
            <ScrollArea className="flex-1 mb-4 p-4 border rounded-lg bg-secondary/30" ref={scrollAreaRef}>
                <div className="space-y-4">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <Bot className="h-6 w-6 text-accent shrink-0"/>}
                            <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                                {getMessageText(msg)}
                            </div>
                            {msg.role === 'user' && <User className="h-6 w-6 text-accent shrink-0"/>}
                        </div>
                    ))}
                    {isLoading && history.length > 0 && (
                         <div className="flex gap-3 justify-start">
                             <Bot className="h-6 w-6 text-accent shrink-0"/>
                             <div className="p-3 rounded-lg bg-background flex items-center">
                                 <Loader2 className="h-5 w-5 animate-spin" />
                             </div>
                         </div>
                    )}
                </div>
            </ScrollArea>
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    Send
                </Button>
            </div>
        </div>
    );
}
