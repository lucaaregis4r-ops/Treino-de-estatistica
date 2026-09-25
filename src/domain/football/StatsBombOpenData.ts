import type { CanonicalFootballEvent, StatsBombLocation } from './StatsBombContract';

export const OPEN_DATA_VERSION = '4.0.0';
export interface ImportedStatsBombEvent extends CanonicalFootballEvent { readonly raw: Readonly<Record<string, unknown>>; readonly source: { readonly repository: string; readonly match_id: string; readonly version: string }; }
export interface CompatibilityManifest { readonly mode: 'full' | 'statsbomb_pure'; readonly source: string; readonly omitted: readonly { readonly id: string; readonly reason: string }[]; readonly preservedUnknownFields: number; readonly contract?: string; readonly supportedFields?: readonly string[]; readonly limitations?: readonly string[]; }
export interface StatsBombPureExport { readonly events: readonly Record<string, unknown>[]; readonly manifest: CompatibilityManifest; }

const KNOWN = new Set(['id', 'index', 'period', 'timestamp', 'minute', 'second', 'type', 'team', 'player', 'possession', 'possession_team', 'play_pattern', 'location', 'related_events', 'pass', 'ball_receipt', 'carry', 'dribble', 'duel', 'interception', 'shot', 'substitution', 'foul_committed', 'foul_won', 'goalkeeper', 'bad_behaviour', 'clearance', 'block', 'ball_recovery', 'miscontrol', 'dispossessed', 'counterpress', 'off_camera', 'out', 'under_pressure', 'tactics', 'freeze_frame']);
function record(value: unknown): Record<string, unknown> { return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; }
function location(value: unknown): StatsBombLocation | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) return undefined;
  return value.length === 2
    ? [value[0], value[1]]
    : value.length === 3
      ? [value[0], value[1], value[2]]
      : undefined;
}

export function importStatsBombEvents(input: unknown, matchId: string): readonly ImportedStatsBombEvent[] {
  if (!Array.isArray(input)) throw new Error('StatsBomb Open Data must be an event array.');
  return input.map((rawValue) => {
    const raw = record(rawValue); const type = record(raw.type); const team = record(raw.team); const player = record(raw.player);
    return {
      ...(raw as unknown as CanonicalFootballEvent), id: String(raw.id), index: Number(raw.index), period: raw.period as 1 | 2, timestamp: String(raw.timestamp), minute: Number(raw.minute), second: Number(raw.second),
      type: { id: Number(type.id), name: String(type.name) },
      ...(raw.team ? { team: { id: Number(team.id), name: String(team.name) } } : {}), ...(raw.player ? { player: { id: Number(player.id), name: String(player.name) } } : {}),
      ...(location(raw.location) ? { location: location(raw.location) } : {}), raw, source: { repository: 'hudl/open-data', match_id: matchId, version: OPEN_DATA_VERSION },
    };
  });
}

export function exportStatsBombPure(events: readonly ImportedStatsBombEvent[], source = 'hudl/open-data'): StatsBombPureExport {
  const omitted: { id: string; reason: string }[] = []; let unknown = 0;
  const output = events.flatMap((event) => {
    const raw = { ...event.raw };
    for (const key of Object.keys(raw)) if (!KNOWN.has(key)) unknown++;
    if (!raw.id || !raw.type || raw.index === undefined || raw.period === undefined || raw.timestamp === undefined) { omitted.push({ id: event.id, reason: 'missing required Open Data identity/time/type field' }); return []; }
    return [raw];
  });
  return { events: output, manifest: { mode: 'statsbomb_pure', source, omitted, preservedUnknownFields: unknown } };
}

export function exportScoutTrainerFull(events: readonly ImportedStatsBombEvent[]): { events: readonly ImportedStatsBombEvent[]; manifest: CompatibilityManifest } {
  return { events, manifest: { mode: 'full', source: 'scout_trainer_backup', omitted: [], preservedUnknownFields: events.reduce((sum, event) => sum + Object.keys(event.raw).filter((key) => !KNOWN.has(key)).length, 0) } };
}

const LOCAL_SUPPORTED = ['id', 'index', 'period', 'timestamp', 'minute', 'second', 'type', 'team', 'player', 'possession', 'possession_team', 'location', 'pass', 'carry', 'shot', 'dribble', 'duel', 'substitution', 'related_events'] as const;

export function validateCanonicalStatsBombSubset(event: CanonicalFootballEvent): readonly string[] {
  const issues: string[] = [];
  if (!event.id || !Number.isSafeInteger(event.index) || event.index < 1) issues.push('invalid identity/index');
  if ((event.period !== 1 && event.period !== 2) || !/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(event.timestamp)) issues.push('invalid period/timestamp');
  if (!Number.isFinite(event.type?.id) || !event.type?.name) issues.push('invalid type');
  const locations = [event.location, event.pass?.end_location, event.carry?.end_location, (event.shot as { end_location?: StatsBombLocation } | undefined)?.end_location].filter((value): value is StatsBombLocation => value !== undefined);
  if (locations.some((value) => value.length < 2 || value.length > 3 || value[0] < 0 || value[0] > 120 || value[1] < 0 || value[1] > 80 || value.some((part) => !Number.isFinite(part)))) issues.push('invalid StatsBomb location');
  if (event.scout_trainer?.modality !== 'football' || !event.scout_trainer.match_id) issues.push('invalid Scout Trainer provenance');
  return issues;
}

/** Lossy provider interchange. The Scout Trainer JSON backup remains the lossless representation. */
export function exportCanonicalStatsBomb(events: readonly CanonicalFootballEvent[]): StatsBombPureExport {
  const omitted: { id: string; reason: string }[] = [];
  const output = events.flatMap((event) => {
    if (event.type.id === 1000) { omitted.push({ id: event.id, reason: 'local control observation; preserved in full backup' }); return []; }
    const issues = validateCanonicalStatsBombSubset(event);
    if (issues.length) { omitted.push({ id: event.id, reason: issues.join('; ') }); return []; }
    const pure: Record<string, unknown> = {};
    for (const field of LOCAL_SUPPORTED) {
      const value = event[field as keyof CanonicalFootballEvent];
      if (value !== undefined) pure[field] = value;
    }
    return [pure];
  });
  return { events: output, manifest: {
    mode: 'statsbomb_pure', source: 'scout_trainer_observed', omitted, preservedUnknownFields: 0,
    contract: 'StatsBomb Open Data events v4.0.0 observed subset', supportedFields: LOCAL_SUPPORTED,
    limitations: ['scout_trainer extensions are omitted from pure provider interchange', 'absent coordinates, players, possession and outcomes remain absent', 'no xG, tracking or inferred success is generated'],
  } };
}
