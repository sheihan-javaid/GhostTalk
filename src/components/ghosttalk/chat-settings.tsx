import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React from "react";

const expiryOptions = [
  { value: '60', label: '1 Minute' },
  { value: '300', label: '5 Minutes' },
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '24 Hours' },
  { value: '0', label: 'Never' },
];

interface ChatSettingsProps {
  children: React.ReactNode;
  onSettingsChange: (expiry: number) => void;
  currentExpiry: number;
}

export default function ChatSettings({ children, onSettingsChange, currentExpiry }: ChatSettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Adjust your privacy settings for this chat. Changes only apply to you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <Label className="font-semibold">Automatic Message Deletion</Label>
            <p className="text-sm text-muted-foreground">
              Messages older than this duration will be automatically deleted from your device.
            </p>
            <RadioGroup
              defaultValue={String(currentExpiry)}
              onValueChange={(value) => onSettingsChange(Number(value))}
            >
              {expiryOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`expiry-${option.value}`} />
                  <Label htmlFor={`expiry-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
