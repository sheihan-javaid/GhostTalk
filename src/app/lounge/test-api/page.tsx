'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testApiKeyAction } from './action';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TestApiPage() {
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleTest = async () => {
        setIsLoading(true);
        const res = await testApiKeyAction();
        setResult(res);
        setIsLoading(false);
    };

    const isSuccess = result.startsWith('Success');

    return (
        <div className="w-full max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle>API Connection Test</CardTitle>
                    <CardDescription>
                        Click the button to test if your app can successfully connect to an external API using your configured API key. This helps verify your environment setup.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleTest} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Run API Test'}
                    </Button>
                    {result && (
                        <div className={cn(
                            "p-4 rounded-md text-sm",
                            isSuccess ? "bg-green-900/50 text-green-200 border border-green-700" : "bg-red-900/50 text-red-200 border border-red-700"
                        )}>
                            <p className="font-bold">{isSuccess ? 'SUCCESS' : 'FAILURE'}</p>
                            <p>{result}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
