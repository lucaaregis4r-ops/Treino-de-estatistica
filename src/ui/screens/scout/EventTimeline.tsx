import type { ProjectedScoutEvent } from '../../../domain/match/events/ScoutTimeline';
import type { ScoutEventMetadata } from '../../../domain/scout/events/ScoutEvent';
import type { Skill } from '../../../domain/scout/entities/Skill';

const skillLabels: Readonly<Record<string, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Free ball',
};

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
  historyLimit,
  pageSize,
  busy,
  onUndo,
  onRedo,
  onEdit,
  onLoadMore,
}: EventTimelineProps) {
  return (
    <section className="event-timeline" aria-labelledby="event-timeline-title">
      <div className="history-heading">
        <h2 id="event-timeline-title">Últimos eventos</h2>
        <div className="history-actions">
          <button type="button" onClick={() => void onUndo()} disabled={busy}>
            Desfazer
          </button>
          <button type="button" onClick={() => void onRedo()} disabled={busy}>
            Refazer
          </button>
        </div>
      </div>
      {timeline.length === 0 ? (
        <p className="history-empty">O primeiro evento aparecerá aqui.</p>
      ) : (
        <>
          {timeline.length > pageSize && (
            <p className="history-count">
              {Math.min(historyLimit, timeline.length)} de {timeline.length}
            </p>
          )}
          <ol className="event-list">
            {timeline
              .slice(-historyLimit)
              .reverse()
              .map((item) => (
                <li key={item.sourceEventId}>
                  <span className="event-sequence">
                    {String(item.event.sequence).padStart(2, '0')}
                  </span>
                  <code>{item.event.rawCode.trim()}</code>
                  <span className="event-meaning">
                    <strong>{skillLabels[item.event.skill]}</strong>
                    {item.event.outcome
                      ? (outcomeLabels[item.event.outcome] ?? item.event.outcome)
                      : ''}
                  </span>
                  <span className="event-context">
                    {item.event.setterPosition ? `L P${item.event.setterPosition}` : ''}
                    {item.event.formationState === 'five_one_inversion' ? ' · inversão' : ''}
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
              ))}
          </ol>
          {historyLimit < timeline.length && (
            <button className="button secondary" type="button" onClick={onLoadMore}>
              Carregar eventos anteriores
            </button>
          )}
        </>
      )}
    </section>
  );
}
