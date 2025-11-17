import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { UiSettings } from "@/lib/types";
import React from "react";

const expiryOptions = [
  { value: '60', label: '1 Minute' },
  { value: '300', label: '5 Minutes' },
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '1 Day' },
  { value: '604800', label: '7 Days' },
  { value: '0', label: 'Never' },
];

interface PrivacySettingsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSettingsChange: (settings: Partial<UiSettings>) => void;
  currentSettings: UiSettings;
}

export default function PrivacySettings({ isOpen, onOpenChange, onSettingsChange, currentSettings }: PrivacySettingsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy Settings</DialogTitle>
          <DialogDescription>
            Manage your privacy options. Changes only apply to you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <div className="space-y-3">
                <Label className="font-semibold">Automatic Message Deletion</Label>
                <p className="text-sm text-muted-foreground">
                Messages older than this duration will be automatically deleted from your view. All messages are permanently deleted from servers after 15 days.
                </p>
                <RadioGroup
                value={String(currentSettings.messageExpiry)}
                onValueChange={(value) => onSettingsChange({ messageExpiry: Number(value) })}
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
