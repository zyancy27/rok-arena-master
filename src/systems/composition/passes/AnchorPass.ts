export interface CompositionPassInput {
  kind?: string;
  tags: string[];
  anchors?: string[];
  traits?: string[];
  explicitValues?: Record<string, unknown>;
}

export interface CompositionPassOutput {
  tags: string[];
  anchors?: string[];
  traits?: string[];
  metadata?: Record<string, unknown>;
}

export const AnchorPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const anchors = [...new Set(input.anchors?.filter(Boolean) || [])];
    const tags = [...new Set([
      ...input.tags,
      ...anchors.map((anchor) => `anchor:${anchor}`),
    ])];

    return {
      tags,
      anchors,
      traits: input.traits,
      metadata: {
        preservedAnchors: anchors,
      },
    };
  },
};
