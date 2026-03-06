import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookChapter } from '@/lib/rules-book-data';

interface BookPageProps {
  chapter: BookChapter;
}

export default function BookPage({ chapter }: BookPageProps) {
  return (
    <div className="space-y-6">
      {/* Chapter title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chapter.icon}</span>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{chapter.title}</h2>
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
            <ul className="space-y-1.5 pl-1">
              {section.examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Expandable sections */}
          {section.expandable && section.expandable.map((exp, i) => (
            <ExpandableItem key={i} label={exp.label} content={exp.content} />
          ))}

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
