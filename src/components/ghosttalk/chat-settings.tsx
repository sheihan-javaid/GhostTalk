import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { UiSettings } from "@/lib/types";
import React from "react";

const themeOptions = [
    { value: 'default', label: 'Default (Purple/Pink)' },
    { value: 'fire', label: 'Fire (Red/Orange)' },
    { value: 'ice', label: 'Ice (Blue/Cyan)' },
    { value: 'forest', label: 'Forest (Green/Lime)' },
    { value: 'cyberpunk', label: 'Cyberpunk (Yellow/Fuchsia)' },
    { value: 'noir', label: 'Noir (Grayscale)' },
]

const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
]

const bubbleStyleOptions = [
    { value: 'rounded', label: 'Rounded' },
    { value: 'sharp', label: 'Sharp' },
]

const animationIntensityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'off', label: 'Off' },
]

interface ChatSettingsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSettingsChange: (settings: Partial<UiSettings>) => void;
  currentSettings: UiSettings;
}

export default function ChatSettings({ isOpen, onOpenChange, onSettingsChange, currentSettings }: ChatSettingsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appearance Settings</DialogTitle>
          <DialogDescription>
            Customize the look and feel of your chat experience.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div className="space-y-3">
            <Label className="font-semibold">Theme Color</Label>
            <RadioGroup
              value={currentSettings.themeColor}
              onValueChange={(value) => onSettingsChange({ themeColor: value as any })}
            >
              {themeOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
                  <Label htmlFor={`theme-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />
          
          <div className="space-y-3">
            <Label className="font-semibold">Font Size</Label>
            <RadioGroup
              value={currentSettings.fontSize}
              onValueChange={(value) => onSettingsChange({ fontSize: value as any })}
            >
              {fontSizeOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`font-${option.value}`} />
                  <Label htmlFor={`font-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="font-semibold">Message Bubbles</Label>
            <RadioGroup
              value={currentSettings.bubbleStyle}
              onValueChange={(value) => onSettingsChange({ bubbleStyle: value as any })}
            >
              {bubbleStyleOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`bubble-${option.value}`} />
                  <Label htmlFor={`bubble-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

           <div className="space-y-3">
            <Label className="font-semibold">Animation Intensity</Label>
             <RadioGroup
              value={currentSettings.animationIntensity}
              onValueChange={(value) => onSettingsChange({ animationIntensity: value as any })}
            >
              {animationIntensityOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`anim-${option.value}`} />
                  <Label htmlFor={`anim-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
