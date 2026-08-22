import type { MetricDefinition } from '../definitions/MetricDefinition';

export class MetricRegistry {
  private readonly definitions = new Map<string, MetricDefinition>();

  constructor(definitions: readonly MetricDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: MetricDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Metric ${definition.id} is already registered.`);
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): MetricDefinition | undefined {
    return this.definitions.get(id);
  }

  list(): readonly MetricDefinition[] {
    return [...this.definitions.values()];
  }
}
