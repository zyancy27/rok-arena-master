import type { BlueprintBase, BlueprintKind } from './BlueprintTypes';

class RegistryStore {
  private blueprints = new Map<string, BlueprintBase>();

  register<TPayload extends Record<string, unknown>>(blueprint: BlueprintBase<TPayload>) {
    this.blueprints.set(blueprint.id, blueprint as BlueprintBase);
    return blueprint;
  }

  registerMany(blueprints: BlueprintBase[]) {
    blueprints.forEach((blueprint) => this.register(blueprint));
    return blueprints;
  }

  get<TPayload extends Record<string, unknown> = Record<string, unknown>>(id: string) {
    return (this.blueprints.get(id) as BlueprintBase<TPayload> | undefined) ?? null;
  }

  list(kind?: BlueprintKind) {
    const values = [...this.blueprints.values()];
    return kind ? values.filter((blueprint) => blueprint.kind === kind) : values;
  }

  has(id: string) {
    return this.blueprints.has(id);
  }

  resolveLineage(id: string, seen = new Set<string>()): BlueprintBase[] {
    if (seen.has(id)) return [];
    seen.add(id);

    const blueprint = this.get(id);
    if (!blueprint) return [];

    const parents = (blueprint.extends || []).flatMap((parentId) => this.resolveLineage(parentId, seen));
    return [...parents, blueprint];
  }

  clear() {
    this.blueprints.clear();
  }
}

export const BlueprintRegistry = new RegistryStore();
