'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Heart } from 'lucide-react';
import { moderateConfession } from '@/ai/flows/moderate-confession';
import Link from 'next/link';

interface Confession {
  id: string;
  text: string;
  timestamp: any;
  likes: number;
}

export default function ConfessionWall() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [newConfession, setNewConfession] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likedConfessions, setLikedConfessions] = useState<string[]>([]);

  const confessionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'confessions'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: confessions, isLoading } = useCollection<Omit<Confession, 'id'>>(confessionsQuery);

  const postConfession = async () => {
    if (!user || !firestore || !newConfession.trim()) return;
    setIsPosting(true);
    
    try {
      // Moderation
      const moderationResult = await moderateConfession(newConfession);
      if (!moderationResult.isAppropriate) {
        toast({ variant: 'destructive', title: 'Inappropriate Content', description: moderationResult.reason || 'This content cannot be posted.' });
        setIsPosting(false);
        return;
      }
      
      const confessionData = {
        text: newConfession,
        timestamp: serverTimestamp(),
        likes: 0,
      };
      await addDocumentNonBlocking(collection(firestore, 'confessions'), confessionData);
      setNewConfession('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not post confession.' });
    } finally {
      setIsPosting(false);
    }
  };
  
  const handleLike = async (confessionId: string) => {
    if (!user || !firestore || likedConfessions.includes(confessionId)) return;

    const confessionRef = doc(firestore, 'confessions', confessionId);
    try {
      await updateDoc(confessionRef, {
        likes: increment(1),
      });
      setLikedConfessions([...likedConfessions, confessionId]);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not like post.' });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 md:p-8">
        <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
      <div className="w-full max-w-2xl space-y-8">
        <Card>
          <CardContent className="p-4 space-y-2">
            <Textarea
              placeholder="Share your anonymous confession..."
              value={newConfession}
              onChange={(e) => setNewConfession(e.target.value)}
              rows={3}
            />
            <Button onClick={postConfession} disabled={isPosting || !newConfession.trim()} className="w-full">
              {isPosting ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Post Anonymously</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading && <div className="text-center"><Loader2 className="animate-spin mx-auto"/></div>}
          {confessions?.map(confession => (
            <Card key={confession.id}>
              <CardContent className="p-4 flex justify-between items-start">
                <p className="text-foreground break-words pr-4">{confession.text}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleLike(confession.id)}
                    disabled={likedConfessions.includes(confession.id)}
                  >
                    <Heart className={cn("h-5 w-5", likedConfessions.includes(confession.id) ? "text-red-500 fill-current" : "text-muted-foreground")} />
                  </Button>
                  <span className="text-sm text-muted-foreground">{confession.likes || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
           {!isLoading && confessions?.length === 0 && <p className="text-center text-muted-foreground">The wall is empty. Be the first to confess.</p>}
        </div>
      </div>
    </div>
  );
}
