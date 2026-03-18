import type { ActionResult } from '@/systems/resolution/ActionResolver';
import type { StructuredCombatResult } from '@/systems/combat/CombatResolver';
import type { IntentDebugPayload } from '@/systems/intent/IntentEngine';

interface IntentDebugCardProps {
  payload: IntentDebugPayload;
  actionResult?: ActionResult | null;
  combatResult?: StructuredCombatResult | null;
}

export function IntentDebugCard({ payload, actionResult, combatResult }: IntentDebugCardProps) {
  return (
    <details className="rounded-lg border border-border bg-muted/40 text-xs">
      <summary className="cursor-pointer list-none px-3 py-2 text-muted-foreground">
        <span className="font-medium text-foreground">Intent Debug</span>
        <span className="ml-2">{payload.intent.type}</span>
        <span className="ml-2">· combat {payload.intent.isCombatAction ? 'yes' : 'no'}</span>
        <span className="ml-2">· confidence {Math.round(payload.classification.confidence * 100)}%</span>
      </summary>
      <div className="space-y-3 border-t border-border px-3 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md bg-background px-2 py-2">
            <p className="mb-1 font-medium text-foreground">Classification</p>
            <p className="text-muted-foreground">type: {payload.classification.type}</p>
            <p className="text-muted-foreground">requires roll: {payload.classification.requiresRoll ? 'yes' : 'no'}</p>
            <p className="text-muted-foreground">sources: {payload.classification.sourceHints.join(', ') || 'fallback'}</p>
          </div>
          <div className="rounded-md bg-background px-2 py-2">
            <p className="mb-1 font-medium text-foreground">Inferred values</p>
            {payload.inferredValues.length > 0 ? (
              <ul className="space-y-1 text-muted-foreground">
                {payload.inferredValues.map(value => <li key={value}>• {value}</li>)}
              </ul>
            ) : (
              <p className="text-muted-foreground">No inferred values.</p>
            )}
          </div>
        </div>

        {payload.fallbackNotes.length > 0 && (
          <div className="rounded-md bg-background px-2 py-2">
            <p className="mb-1 font-medium text-foreground">Fallback notes</p>
            <ul className="space-y-1 text-muted-foreground">
              {payload.fallbackNotes.map(note => <li key={note}>• {note}</li>)}
            </ul>
          </div>
        )}

        {actionResult && (
          <div className="rounded-md bg-background px-2 py-2 text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Action result</p>
            <p>success: {actionResult.success ? 'true' : 'false'}</p>
            <p>effectiveness: {actionResult.effectiveness}</p>
            <p>impact: {actionResult.impact}</p>
            {actionResult.consequences.length > 0 && (
              <p>consequences: {actionResult.consequences.join(' | ')}</p>
            )}
          </div>
        )}

        {combatResult && (
          <div className="rounded-md bg-background px-2 py-2 text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Combat result</p>
            <p>outcome: {combatResult.outcome}</p>
            <p>range: {combatResult.positioning.currentRange} → {combatResult.positioning.resolvedRange}</p>
            <p>initiative: {combatResult.timing.initiative}</p>
            <p>engaged: {combatResult.engagement.engaged ? 'true' : 'false'}</p>
            {combatResult.damage && <p>damage: {combatResult.damage.amount} ({combatResult.damage.severity})</p>}
          </div>
        )}

        <pre className="overflow-x-auto rounded-md bg-background px-2 py-2 text-[11px] text-muted-foreground">{JSON.stringify(payload.intent, null, 2)}</pre>
      </div>
    </details>
  );
}
