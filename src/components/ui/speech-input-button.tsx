import * as React from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SpeechInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function SpeechInputButton({
  isListening,
  isSupported,
  error,
  onToggle,
  disabled = false,
  className,
}: SpeechInputButtonProps) {
  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled
              className={cn("opacity-50 cursor-not-allowed", className)}
            >
              <MicOff className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Speech recognition not supported in this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            onClick={onToggle}
            disabled={disabled}
            className={cn(
              "relative transition-all",
              isListening && "animate-pulse",
              className
            )}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <Mic className={cn("w-4 h-4", isListening && "text-destructive-foreground")} />
            {isListening && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{error || (isListening ? "Listening... Click to stop" : "Click to speak")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
