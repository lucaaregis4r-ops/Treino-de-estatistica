import type { ProjectedScoutEvent } from '../../../domain/match/events/ScoutTimeline';
import type { Team } from '../../../domain/match/entities/Team';
import type { Player } from '../../../domain/match/entities/Player';
import type { ScoutEventMetadata } from '../../../domain/scout/events/ScoutEvent';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { FaultEvent } from '../../../domain/match/events/MatchEvent';
import { SKILL_LABELS } from './presentationLabels';

const outcomeLabels: Readonly<Record<string, string>> = {
  ace: 'ace',
  point: 'ponto',
  positive: 'positivo',
  neutral: 'neutro',
  negative: 'negativo',
  perfect: 'perfeito',
  playable: 'jogável',
  overpass: 'bola passada',
  blocked: 'bloqueado',
  error: 'erro',
};

const completenessFieldLabels: Readonly<Record<string, string>> = {
  skillType: 'tipo da ação',
  originZone: 'zona de origem',
  targetZone: 'zona de destino',
  direction: 'direção',
  setterPosition: 'posição do levantador',
  setterCall: 'chamada do levantador',
  attackCombination: 'combinação',
  attackTempo: 'tempo de ataque',
  blockersCount: 'bloqueadores',
  phase: 'fase',
  transition: 'transição',
};

interface EventTimelineProps {
  readonly timeline: readonly ProjectedScoutEvent[];
  readonly faults?: readonly FaultEvent[];
  readonly teams: readonly Team[];
  readonly players: readonly Player[];
  readonly historyLimit: number;
  readonly pageSize: number;
  readonly busy: boolean;
  readonly onUndo: () => Promise<void>;
  readonly onRedo: () => Promise<void>;
  readonly onEdit: (
    sourceEventId: string,
    rawCode: string,
    skill: Skill,
    metadata?: ScoutEventMetadata,
  ) => void;
  readonly onLoadMore: () => void;
}

export function EventTimeline({
  timeline,
  faults = [],
  teams,
  players,
  historyLimit,
  pageSize,
  busy,
  onUndo,
  onRedo,
  onEdit,
  onLoadMore,
}: EventTimelineProps) {
  const faultLabels: Readonly<Record<FaultEvent['faultType'], string>> = {
    net_touch: 'Toque na rede',
    invasion: 'Invasão',
    double_touch: 'Dois toques',
    rotation_error: 'Erro de rotação',
  };
  const historyItems = [
    ...timeline.map((item) => ({ kind: 'scout' as const, sequence: item.event.sequence, item })),
    ...faults.map((fault) => ({ kind: 'fault' as const, sequence: fault.sequence, fault })),
  ].sort((left, right) => left.sequence - right.sequence);
  return (
    <section className="event-timeline" aria-labelledby="event-timeline-title">
      <div className="history-heading">
        <h2 id="event-timeline-title">Últimos eventos</h2>
        <div className="history-actions">
          {timeline.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const item = timeline.at(-1);
                if (item) onEdit(item.sourceEventId, item.event.rawCode, item.event.skill, item.event.metadata);
              }}
              disabled={busy}
            >
              Corrigir último rally
            </button>
          )}
          <button type="button" onClick={() => void onUndo()} disabled={busy}>
            Desfazer
          </button>
          <button type="button" onClick={() => void onRedo()} disabled={busy}>
            Refazer
          </button>
        </div>
      </div>
      {historyItems.length === 0 ? (
        <p className="history-empty">O primeiro evento aparecerá aqui.</p>
      ) : (
        <>
          {historyItems.length > pageSize && (
            <p className="history-count">
              {Math.min(historyLimit, historyItems.length)} de {historyItems.length}
            </p>
          )}
          <ol className="event-list">
            {historyItems
              .slice(-historyLimit)
              .reverse()
              .map((entry) => entry.kind === 'fault' ? (
                <li key={entry.fault.id}>
                  <span className="event-sequence">{String(entry.fault.sequence).padStart(2, '0')}</span>
                  <code>Infração</code>
                  <span className="event-meaning"><strong>{faultLabels[entry.fault.faultType]}</strong> ponto adversário</span>
                  <span className="event-context">
                    {teams.find((team) => team.id === entry.fault.teamId)?.name ?? 'Equipe não identificada'}
                    {' · '}
                    {entry.fault.athleteId
                      ? players.find((player) => player.id === entry.fault.athleteId)?.name ?? 'Atleta identificado'
                      : 'Sem atleta identificado'}
                  </span>
                  <span className="event-flags" />
                  <span aria-hidden="true" />
                </li>
              ) : (() => {
                const item = entry.item;
                return (
                <li key={item.sourceEventId}>
                  <span className="event-sequence">
                    {String(item.event.sequence).padStart(2, '0')}
                  </span>
                  <code title={item.event.rawCode.trim()}>
                    {item.event.rawCode.trim().startsWith('[VISUAL]') ? 'Visual' : item.event.rawCode.trim()}
                  </code>
                  <span className="event-meaning">
                    <strong>{SKILL_LABELS[item.event.skill]}</strong>
                    {item.event.outcome
                      ? (outcomeLabels[item.event.outcome] ?? item.event.outcome)
                      : ''}
                  </span>
                  <span className="event-context">
                    {(() => {
                      const player = item.event.playerId
                        ? players.find((candidate) => candidate.id === item.event.playerId)
                        : undefined;
                      return [
                        teams.find((team) => team.id === item.event.teamId)?.name ?? 'Equipe não identificada',
                        player
                          ? `#${String(player.number).padStart(2, '0')} ${player.name ?? ''}`
                          : 'Sem atleta identificado',
                        item.event.setterPosition ? `L P${item.event.setterPosition}` : '',
                        item.event.formationState === 'five_one_inversion' ? 'inversão' : '',
                      ].filter(Boolean).join(' · ');
                    })()}
                  </span>
                  <span className="event-flags">
                    {item.corrected && <span className="corrected-badge">corrigido</span>}
                    {item.event.completeness?.status === 'partial' && (
                      <span
                        className="partial-badge"
                        title={`Faltam: ${item.event.completeness.missingRecommendedFields
                          .map((field) => completenessFieldLabels[field] ?? field)
                          .join(', ')}`}
                      >
                        parcial · faltam{' '}
                        {item.event.completeness.missingRecommendedFields
                          .map((field) => completenessFieldLabels[field] ?? field)
                          .join(', ')}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onEdit(
                        item.sourceEventId,
                        item.event.rawCode,
                        item.event.skill,
                        item.event.metadata,
                      )
                    }
                  >
                    {item.event.completeness?.status === 'partial' ? 'Completar' : 'Corrigir'}
                  </button>
                </li>
                );
              })())}
          </ol>
          {historyLimit < historyItems.length && (
            <button className="button secondary" type="button" onClick={onLoadMore}>
              Carregar eventos anteriores
            </button>
          )}
        </>
      )}
    </section>
  );
}
