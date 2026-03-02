/**
 * VoiceTextarea — auto-expanding textarea with speech-to-text mic button.
 * Drop-in replacement for <Input> in chat contexts.
 */

import * as React from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';

export interface VoiceTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Show the mic button (default true) */
  showMic?: boolean;
  /** Extra class on the outer wrapper */
  wrapperClassName?: string;
}

const VoiceTextarea = React.forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({ value, onValueChange, showMic = true, wrapperClassName, className, disabled, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const recognitionRef = useRef<any>(null);
    const [listening, setListening] = useState(false);

    // Auto-resize textarea to fit content
    const resize = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, []);

    useEffect(() => {
      resize();
    }, [value, resize]);

    // Clean up recognition on unmount
    useEffect(() => {
      return () => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
      };
    }, []);

    const toggleListening = useCallback(() => {
      if (listening) {
        recognitionRef.current?.stop();
        setListening(false);
        return;
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        // Fallback: alert user
        alert('Speech recognition is not supported in this browser.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = value;

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + transcript;
          } else {
            interim += transcript;
          }
        }
        onValueChange(finalTranscript + (interim ? ' ' + interim : ''));
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    }, [listening, value, onValueChange]);

    const setRefs = useCallback(
      (el: HTMLTextAreaElement | null) => {
        internalRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      },
      [ref],
    );

    const hasSpeechSupport =
      typeof window !== 'undefined' &&
      !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      );

    return (
      <div className={cn('relative flex items-end gap-1', wrapperClassName)}>
        <textarea
          ref={setRefs}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          rows={1}
          disabled={disabled}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto',
            className,
          )}
          style={{ minHeight: '40px', maxHeight: '200px' }}
          {...props}
        />
        {showMic && hasSpeechSupport && (
          <Button
            type="button"
            variant={listening ? 'destructive' : 'ghost'}
            size="icon"
            className={cn(
              'shrink-0 h-10 w-10 transition-colors',
              listening && 'animate-pulse',
            )}
            onClick={toggleListening}
            disabled={disabled}
            aria-label={listening ? 'Stop dictation' : 'Start dictation'}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  },
);

VoiceTextarea.displayName = 'VoiceTextarea';

export { VoiceTextarea };
