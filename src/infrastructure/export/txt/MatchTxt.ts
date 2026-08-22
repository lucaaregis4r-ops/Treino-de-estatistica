import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';

export class TxtMatchExporter {
  export(events: readonly ScoutEvent[]): string {
    return events.map((event) => event.rawCode.trim()).join('\n');
  }
}
