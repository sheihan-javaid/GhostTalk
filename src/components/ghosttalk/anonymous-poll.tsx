'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, doc, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X } from 'lucide-react';
import LoadingGhost from './loading-ghost';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [key: string]: number };
  createdAt: any;
}

export default function AnonymousPoll() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isCreating, setIsCreating] = useState(false);
  const [votedPolls, setVotedPolls] = useState<string[]>([]);

  const pollsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'polls'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: polls, isLoading } = useCollection<Omit<Poll, 'id'>>(pollsQuery);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const createPoll = async () => {
    if (!user || !firestore || !question.trim() || options.some(o => !o.trim())) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out the question and all options.' });
      return;
    }

    setIsCreating(true);
    const votes = options.reduce((acc, _, index) => ({ ...acc, [index]: 0 }), {});

    const newPoll = {
      question,
      options,
      votes,
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(firestore, 'polls'), newPoll)
        .then(() => {
            setQuestion('');
            setOptions(['', '']);
            toast({ title: 'Success!', description: 'Your poll has been created.' });
        })
        .catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create poll.' });
        })
        .finally(() => {
            setIsCreating(false);
        });
  };
  
  const handleVote = (pollId: string, optionIndex: number) => {
    if (!user || !firestore || votedPolls.includes(pollId)) return;
    
    const pollRef = doc(firestore, 'polls', pollId);
    updateDocumentNonBlocking(pollRef, {
        [`votes.${optionIndex}`]: increment(1),
    });
    setVotedPolls([...votedPolls, pollId]);
  };
  
  const getTotalVotes = (votes: { [key: string]: number }) => {
    if (!votes) return 0;
    return Object.values(votes).reduce((sum, count) => sum + count, 0);
  }

  if (isLoading) {
    return <LoadingGhost />;
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create an Anonymous Poll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="What's your question?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
                {options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={addOption} disabled={options.length >= 5}>
              <Plus className="h-4 w-4 mr-2" /> Add Option
            </Button>
            <Button onClick={createPoll} disabled={isCreating}>
              {isCreating ? <Loader2 className="animate-spin" /> : 'Create Poll'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Live Polls</h2>
          {polls?.map(poll => {
              const totalVotes = getTotalVotes(poll.votes);
              return (
              <Card key={poll.id}>
                  <CardHeader>
                  <CardTitle>{poll.question}</CardTitle>
                  <CardDescription>Total Votes: {totalVotes}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                  {poll.options.map((option, index) => {
                      const voteCount = poll.votes?.[index] || 0;
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      const hasVoted = votedPolls.includes(poll.id);

                      return (
                          <div key={index}>
                              <Button
                                  variant={hasVoted ? 'secondary' : 'outline'}
                                  className="w-full justify-start h-auto p-0 relative overflow-hidden"
                                  onClick={() => handleVote(poll.id, index)}
                                  disabled={hasVoted}
                              >
                                  <div 
                                      className="absolute left-0 top-0 h-full bg-accent/30"
                                      style={{ width: `${hasVoted ? percentage : 0}%` }}
                                  ></div>
                                  <div className="relative z-10 flex justify-between w-full p-2">
                                      <span>{option}</span>
                                      {hasVoted && <span>{voteCount} ({percentage.toFixed(0)}%)</span>}
                                  </div>
                              </Button>
                          </div>
                      )
                  })}
                  </CardContent>
              </Card>
              )
          })}
          {!isLoading && polls?.length === 0 && <p className="text-center text-muted-foreground">No polls yet. Be the first to create one!</p>}
      </div>
    </div>
  );
}
