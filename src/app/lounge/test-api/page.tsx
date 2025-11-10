'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TestTube } from 'lucide-react';
import OpenAI from 'openai';

// This is a client-side component, so we can't use process.env directly
// after the build. We'll create a server action to securely access the key.
// For this simple test, we will create a simple server action in this file.

async function testApiKeyAction(): Promise<string> {
    'use server';
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY') {
        return 'Error: OPENROUTER_API_KEY is not set in your .env file.';
    }

    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
    });

    try {
        const completion = await openai.chat.completions.create({
            model: 'nousresearch/nous-hermes-2-mistral-7b-dpo',
            messages: [{ role: 'user', content: 'Say "hello".' }],
            max_tokens: 5,
        });
        const response = completion.choices[0].message.content;
        return `Success! API responded: "${response}"`;
    } catch (error: any) {
        console.error('API Key Test Error:', error);
        return `Failure: An error occurred. Check the server console for details. Error message: ${error.message}`;
    }
}


export default function TestApiKeyPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleTest = async () => {
        setIsLoading(true);
        setResult(null);
        const testResult = await testApiKeyAction();
        setResult(testResult);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-6 w-6 text-accent" />
                        OpenRouter API Key Tester
                    </CardTitle>
                    <CardDescription>
                        Click the button to test the connectivity to the OpenRouter AI service using the API key from your .env file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleTest} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Run Test'}
                    </Button>
                    {result && (
                        <Card className="p-4 bg-secondary">
                             <CardTitle className="text-lg mb-2">Test Result:</CardTitle>
                             <p className={`text-sm ${result.startsWith('Success') ? 'text-green-400' : 'text-red-400'}`}>
                                {result}
                             </p>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
