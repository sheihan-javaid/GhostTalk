'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Heart, Paperclip, X } from 'lucide-react';
import { moderateConfession } from '@/ai/flows/moderate-confession';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import LoadingGhost from './loading-ghost';

interface Confession {
  id: string;
  text: string;
  timestamp: any;
  likes: number;
  media?: string; // Data URL for the image
}

export default function ConfessionWall() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [newConfession, setNewConfession] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [likedConfessions, setLikedConfessions] = useState<string[]>([]);

  const confessionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'confessions'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: confessions, isLoading } = useCollection<Omit<Confession, 'id'>>(confessionsQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };
  
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  const postConfession = async () => {
    if (!user || !firestore || (!newConfession.trim() && !mediaFile)) return;
    setIsPosting(true);
    
    try {
      // Moderation
      const moderationResult = await moderateConfession(newConfession);
      if (!moderationResult.isAppropriate) {
        toast({ variant: 'destructive', title: 'Inappropriate Content', description: moderationResult.reason || 'This content cannot be posted.' });
        setIsPosting(false);
        return;
      }
      
      let mediaDataUrl: string | undefined = undefined;
      if (mediaFile) {
        mediaDataUrl = await fileToDataUrl(mediaFile);
      }

      const confessionData: {text: string, timestamp: any, likes: number, media?: string} = {
        text: newConfession,
        timestamp: serverTimestamp(),
        likes: 0,
      };

      if (mediaDataUrl) {
          confessionData.media = mediaDataUrl;
      }
      
      await addDocumentNonBlocking(collection(firestore, 'confessions'), confessionData);
      setNewConfession('');
      removeMedia();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not post confession.' });
    } finally {
      setIsPosting(false);
    }
  };
  
  const handleLike = (confessionId: string) => {
    if (!user || !firestore || likedConfessions.includes(confessionId)) return;

    const confessionRef = doc(firestore, 'confessions', confessionId);
    updateDocumentNonBlocking(confessionRef, {
        likes: increment(1),
    });
    setLikedConfessions([...likedConfessions, confessionId]);
  };

  if (isLoading) {
      return <LoadingGhost />;
  }

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
            {mediaPreview && (
              <div className="relative w-full max-w-xs mx-auto">
                <Image
                  src={mediaPreview}
                  alt="Media preview"
                  width={400}
                  height={400}
                  className="rounded-md object-contain max-h-64 w-auto"
                />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeMedia}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <label htmlFor="file-input" className="cursor-pointer">
                <Button asChild variant="ghost" className="text-muted-foreground">
                  <div>
                    <Paperclip className="h-5 w-5"/>
                    <input id="file-input" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                </Button>
              </label>
              <Button onClick={postConfession} disabled={isPosting || (!newConfession.trim() && !mediaFile)} className="w-48">
                {isPosting ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Post Anonymously</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {confessions?.map(confession => (
            <Card key={confession.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 break-words pr-4">
                    {confession.text && <p className="text-foreground">{confession.text}</p>}
                    {confession.media && (
                      <div className="mt-2">
                        <Image 
                          src={confession.media}
                          alt="Confession media"
                          width={600}
                          height={600}
                          className="rounded-md max-h-[50vh] w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
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
