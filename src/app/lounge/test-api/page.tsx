'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TestTube } from 'lucide-react';
import { testApiKeyAction } from './action';


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
