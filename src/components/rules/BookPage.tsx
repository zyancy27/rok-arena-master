import React, { useState } from 'react';
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookChapter } from '@/lib/rules-book-data';

interface BookPageProps {
  chapter: BookChapter;
  onCrossRefClick?: (mechanicKey: string) => void;
}

export default function BookPage({ chapter, onCrossRefClick }: BookPageProps) {
  return (
    <div className="space-y-6">
      {/* Chapter title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chapter.icon}</span>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{chapter.title}</h2>
          {chapter.isLiving && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider font-medium flex items-center gap-0.5">
              <Sparkles className="w-2 h-2" /> Living
            </span>
          )}
        </div>
        <div className="w-full h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
      </div>

      {/* Sections */}
      {chapter.sections.map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
            {section.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {section.content}
          </p>

          {/* Examples */}
          {section.examples && section.examples.length > 0 && (
            <div className="space-y-1.5 pl-1">
              {section.examples.map((ex, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 text-xs text-muted-foreground",
                  chapter.isLiving && i === 0 && "bg-muted/30 rounded-md px-2 py-1.5 border-l-2 border-primary/30"
                )}>
                  {chapter.isLiving && i === 0 ? (
                    <>
                      <span className="text-primary shrink-0 text-[10px] uppercase font-medium mt-0.5">Example:</span>
                      <span className="italic">{ex}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{ex}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expandable sections */}
          {section.expandable && section.expandable.map((exp, i) => (
            <ExpandableItem key={i} label={exp.label} content={exp.content} />
          ))}

          {/* Cross-references */}
          {section.crossRefs && section.crossRefs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                Related Mechanics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {section.crossRefs.map((ref, i) => (
                  <button
                    key={i}
                    onClick={() => onCrossRefClick?.(ref.mechanicKey)}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ArrowRight className="w-2 h-2" />
                    {ref.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {idx < chapter.sections.length - 1 && (
            <div className="w-8 h-px bg-border/50 mx-auto my-4" />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandableItem({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
      )}>
        <p className="px-3 pb-2 text-xs text-muted-foreground leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
}
