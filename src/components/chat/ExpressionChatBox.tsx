/**
 * ExpressionChatBox
 *
 * Wraps any chat message content with expression-driven data attributes,
 * CSS variables, and entry animations. This is the "physical body" of
 * every speaker in the chat system.
 *
 * Usage:
 *   <ExpressionChatBox expression={packet}>
 *     <div className="expr-speaker-name">...</div>
 *     <div className="expr-content">...</div>
 *   </ExpressionChatBox>
 */

import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ExpressionCssEngine } from '@/systems/expression/ExpressionCssEngine';
import type { ExpressionPacket } from '@/systems/expression/ExpressionPacket';

interface ExpressionChatBoxProps {
  expression?: ExpressionPacket | null;
  children: ReactNode;
  className?: string;
}

export default function ExpressionChatBox({
  expression,
  children,
  className,
}: ExpressionChatBoxProps) {
  const expressionProps = useMemo(() => {
    if (!expression) return null;
    return ExpressionCssEngine.toProps(expression);
  }, [expression]);

  if (!expressionProps) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(expressionProps.entryClassName, className)}
      style={expressionProps.cssVars as unknown as React.CSSProperties}
      {...expressionProps.dataAttributes}
    >
      {children}
    </div>
  );
}
