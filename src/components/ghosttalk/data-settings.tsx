
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import * as crypto from '@/lib/crypto';
import { Copy, Trash2, RefreshCcw, AlertTriangle } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";

interface DataSettingsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function DataSettings({ isOpen, onOpenChange }: DataSettingsProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleExportKeys = () => {
    const keyPairString = crypto.exportMyKeyPairString();
    if (keyPairString) {
      navigator.clipboard.writeText(keyPairString);
      toast({
        title: "Keys Copied!",
        description: "Your key pair has been copied to your clipboard. Store it securely.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No keys found to export.",
      });
    }
  };
  
  const handleRegenerateIdentity = () => {
    crypto.initializeKeyPair(true).then(() => {
        toast({
            title: "Identity Regenerated",
            description: "New keys created. You will be returned to the home screen.",
        });
        // Navigate to home to re-initialize the app state with new keys
        router.push('/');
    });
  };

  const handleClearCache = () => {
    try {
        crypto.clearLocalCache();
        toast({
            title: "Cache Cleared",
            description: "All local GhostTalk data has been removed. You will be returned to the home screen.",
        });
        router.push('/');
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not clear local cache.",
        });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data & Identity Settings</DialogTitle>
          <DialogDescription>
            Manage your cryptographic keys and local data.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
            
            <div className="space-y-2">
                <h4 className="font-semibold">Export Keys</h4>
                <p className="text-sm text-muted-foreground">
                    Copy your current key pair to your clipboard. Keep this backup somewhere safe to restore your identity later.
                </p>
                <Button variant="outline" onClick={handleExportKeys}>
                    <Copy className="mr-2 h-4 w-4"/>
                    Export My Keys
                </Button>
            </div>

            <Separator />

            <div className="space-y-2">
                <h4 className="font-semibold">Regenerate Identity</h4>
                <p className="text-sm text-muted-foreground">
                    Create a new cryptographic key pair. This is a destructive action and cannot be undone. You will lose access to your current identity and messages.
                </p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <RefreshCcw className="mr-2 h-4 w-4"/>
                            Regenerate New Identity
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete your current identity and create a new one. You will not be able to decrypt your old messages. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRegenerateIdentity}>Yes, create new identity</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
                <h4 className="font-semibold">Clear Local Cache</h4>
                <p className="text-sm text-muted-foreground">
                    Remove all GhostTalk data, including your keys, from your browser's local storage.
                </p>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Clear Local Cache
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all your local data, including your identity keys. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearCache}>Yes, clear all data</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
