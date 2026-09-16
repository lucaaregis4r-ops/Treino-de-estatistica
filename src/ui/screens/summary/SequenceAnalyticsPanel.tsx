import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  buildRallyPathFlow,
  buildRallyPathModel,
  compareRallyPathQualities,
  pathStateLabel,
  selectRallyPathFocus,
  type FlowLink,
  type FlowNode,
  type PathStateDescriptor,
  type RallyPathFocusFilters,
  type RallyPathOccurrence,
  type RallyPathRally,
  type RallyPathSkill,
} from '../../../domain/analytics/markov';
import type { SequenceAnalytics } from '../../../application/analytics/SequenceAnalyticsService';
import type { ZoneSystemProfile } from '../../../domain/scout/tactical/ZoneSystemProfile';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { evaluationLabel, SKILL_LABELS } from '../scout/presentationLabels';
import './SequenceAnalyticsPanel.css';

interface SequenceAnalyticsPanelProps {
  readonly analytics: SequenceAnalytics;
  readonly teams: readonly { readonly id: string; readonly name: string }[];
  readonly teamId: string;
  readonly players?: readonly {
    readonly id: string;
    readonly teamId: string;
    readonly number: number;
    readonly name: string;
  }[];
}

const SKILL_OPTIONS: readonly RallyPathSkill[] = [
  'serve',
  'reception',
  'set',
  'attack',
  'block',
  'dig',
  'free_ball',
  'fault',
];
const OUTSIDE_ZONE = '__outside__';
const MISSING_QUALITY = '__missing__';
const MAX_TRAJECTORIES = 30;

type SetFilter = 'all' | number;
type SpatialRole = 'origin' | 'target';
type CourtMode = 'actions' | 'trajectories';
type FocusSnapshot = {
  readonly teamId: string;
  readonly skill: RallyPathSkill;
  readonly quality: string;
  readonly playerId: string;
  readonly rotation: string;
  readonly spatialRole: SpatialRole;
  readonly spatialRegionId: string;
  readonly setFilter: SetFilter;
};

function percent(value: number | null, digits = 1): string {
  return value === null
    ? '—'
    : value.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: digits });
}

function wholePercent(value: number | null): string {
  return value === null
    ? '—'
    : value.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
}

function skillLabel(skill: RallyPathSkill | 'terminal'): string {
  if (skill === 'terminal') return 'Desfecho';
  if (skill === 'fault') return 'Infração';
  if (skill === 'defense') return 'Defesa';
  return SKILL_LABELS[skill] ?? skill;
}

function qualityText(skill: RallyPathSkill | 'terminal', quality?: string): string {
  if (!quality || quality === MISSING_QUALITY) return 'Sem avaliação';
  if (skill === 'fault' || skill === 'terminal') return quality;
  return evaluationLabel(skill as Skill, quality);
}

function shortQuality(quality?: string): string {
  return quality && quality !== MISSING_QUALITY ? quality : '—';
}

function stateText(
  state: PathStateDescriptor,
  teams: readonly { id: string; name: string }[],
): string {
  const name = teams.find((team) => team.id === state.teamId)?.name ?? state.teamId;
  return state.terminal
    ? `Ponto ${name}`
    : pathStateLabel(state, name, skillLabel(state.skill), qualityText(state.skill, state.quality));
}

function stateLines(
  state: PathStateDescriptor,
  teams: readonly { id: string; name: string }[],
): readonly string[] {
  const name = teams.find((team) => team.id === state.teamId)?.name ?? state.teamId;
  return state.terminal
    ? [`Ponto ${name}`]
    : [name, `${skillLabel(state.skill)} · ${shortQuality(state.quality)}`];
}

function qualityKey(quality?: string): string {
  return quality ?? MISSING_QUALITY;
}

function qualityLabel(skill: RallyPathSkill, quality: string): string {
  return quality === MISSING_QUALITY ? 'Sem avaliação' : qualityText(skill, quality);
}

function teamName(teams: readonly { id: string; name: string }[], id: string): string {
  return teams.find((team) => team.id === id)?.name ?? id;
}

function focusSnapshot(filters: RallyPathFocusFilters, setFilter: SetFilter): FocusSnapshot {
  return {
    teamId: filters.teamId,
    skill: filters.skill,
    quality: filters.quality ?? '',
    playerId: filters.playerId ?? '',
    rotation: filters.rotation === undefined ? '' : String(filters.rotation),
    spatialRole: filters.spatialRole ?? 'origin',
    spatialRegionId: filters.spatialRegionId ?? '',
    setFilter,
  };
}

function countCoordinates(occurrences: readonly RallyPathOccurrence[], role: SpatialRole): number {
  return occurrences.filter((occurrence) => {
    const point =
      role === 'origin' ? occurrence.contact.spatial.origin : occurrence.contact.spatial.target;
    return Boolean(point && (point.surface ?? 'court') === 'court');
  }).length;
}

function qualityColorIndex(quality: string | undefined, qualities: readonly string[]): number {
  const index = qualities.indexOf(qualityKey(quality));
  return index < 0 ? 0 : index % 6;
}

function initialQualityValues(
  rallies: readonly RallyPathRally[],
  teamId: string,
  skill: RallyPathSkill,
): readonly string[] {
  return [
    ...new Set(
      rallies
        .filter((rally) => rally.status === 'eligible')
        .flatMap((rally) =>
          rally.contacts
            .filter((contact) => contact.teamId === teamId && contact.skill === skill)
            .map((contact) => qualityKey(contact.quality)),
        ),
    ),
  ].sort();
}

function initialSkills(
  rallies: readonly RallyPathRally[],
  teamId: string,
): readonly RallyPathSkill[] {
  return SKILL_OPTIONS.filter((skill) =>
    rallies.some(
      (rally) =>
        rally.status === 'eligible' &&
        rally.contacts.some((contact) => contact.teamId === teamId && contact.skill === skill),
    ),
  );
}

function occurrenceText(
  occurrence: RallyPathOccurrence,
  teams: readonly { id: string; name: string }[],
): string {
  return occurrence.path.map((state) => stateText(state, teams)).join(' → ');
}

function FlowSvg({
  flow,
  teams,
  selectedNodeId,
  selectedLinkId,
  onNode,
  onLink,
}: {
  readonly flow: ReturnType<typeof buildRallyPathFlow>;
  readonly teams: readonly { id: string; name: string }[];
  readonly selectedNodeId?: string;
  readonly selectedLinkId?: string;
  readonly onNode: (node: FlowNode) => void;
  readonly onLink: (link: FlowLink) => void;
}) {
  const nodeWidth = 190;
  const nodeHeight = 64;
  const columnGap = 300;
  const maxDepth = Math.max(0, ...flow.nodes.map((node) => node.depth));
  const height = Math.max(
    260,
    ...Array.from(
      { length: maxDepth + 1 },
      (_, depth) => flow.nodes.filter((node) => node.depth === depth).length * 90 + 44,
    ),
  );
  const columns = new Map<number, FlowNode[]>();
  flow.nodes.forEach((node) => columns.set(node.depth, [...(columns.get(node.depth) ?? []), node]));
  columns.forEach((nodes) =>
    nodes.sort((left, right) => right.count - left.count || left.id.localeCompare(right.id)),
  );
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((nodes, depth) =>
    nodes.forEach((node, index) =>
      positions.set(node.id, { x: 20 + depth * columnGap, y: 30 + index * 90 }),
    ),
  );
  const maxLinkCount = Math.max(1, ...flow.links.map((link) => link.count));
  return (
    <svg
      className="rally-flow-svg"
      viewBox={`0 0 ${20 + maxDepth * columnGap + nodeWidth + 20} ${height}`}
      role="img"
      aria-label="Fluxo observado dos caminhos do rally"
    >
      <g className="rally-flow-column-labels">
        {Array.from({ length: maxDepth + 1 }, (_, depth) => (
          <text key={depth} x={20 + depth * columnGap} y="16">
            {depth === 0 ? 'Situação inicial' : `${depth} contato${depth > 1 ? 's' : ''} depois`}
          </text>
        ))}
      </g>
      <g className="rally-flow-links">
        {flow.links.map((link) => {
          const from = positions.get(link.fromNodeId);
          const to = positions.get(link.toNodeId);
          if (!from || !to) return null;
          const y1 = from.y + nodeHeight / 2;
          const y2 = to.y + nodeHeight / 2;
          const x1 = from.x + nodeWidth;
          const x2 = to.x;
          const curve = Math.max(35, (x2 - x1) / 2);
          const fromNode = flow.nodes.find((node) => node.id === link.fromNodeId);
          const toNode = flow.nodes.find((node) => node.id === link.toNodeId);
          const fromLabel = fromNode?.state ? stateText(fromNode.state, teams) : 'Outros caminhos';
          const toLabel = toNode?.state ? stateText(toNode.state, teams) : 'Outros caminhos';
          return (
            <g
              key={link.id}
              className={
                selectedLinkId === link.id
                  ? 'rally-flow-link-group selected'
                  : 'rally-flow-link-group'
              }
              role="button"
              tabIndex={0}
              aria-label={`${fromLabel} para ${toLabel} · ${link.count} de ${link.prefixCount} ocorrências · ${percent(link.localProbability)}`}
              onClick={() => onLink(link)}
              onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                if (event.key === 'Enter' || event.key === ' ') onLink(link);
              }}
            >
              <path
                d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
                strokeWidth={Math.max(2, 3 + (link.count / maxLinkCount) * 13)}
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 7}
              >{`${link.count}/${link.prefixCount} · ${wholePercent(link.localProbability)}`}</text>
            </g>
          );
        })}
      </g>
      <g className="rally-flow-nodes">
        {flow.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const lines = node.state ? stateLines(node.state, teams) : ['Outros caminhos'];
          return (
            <g
              key={node.id}
              className={`${selectedNodeId === node.id ? 'rally-flow-node selected' : 'rally-flow-node'} ${node.kind === 'other' ? 'other' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${node.state ? stateText(node.state, teams) : 'Outros caminhos'} · ${node.count} ocorrências${node.potential === null ? '' : ` · potencial ${percent(node.potential)}`}`}
              onClick={() => onNode(node)}
              onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                if (event.key === 'Enter' || event.key === ' ') onNode(node);
              }}
            >
              <rect x={position.x} y={position.y} width={nodeWidth} height={nodeHeight} rx="8" />
              {lines.map((line, index) => (
                <text
                  key={`${node.id}-${line}`}
                  x={position.x + 10}
                  y={position.y + 19 + index * 15}
                >
                  {line}
                </text>
              ))}
              <text
                className="rally-flow-node-meta"
                x={position.x + 10}
                y={position.y + 56}
              >{`n=${node.count} · ${node.potential === null ? 'sem V' : percent(node.potential)}`}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function MobileFlow({
  flow,
  teams,
  nodeId,
  setNodeId,
  onLink,
}: {
  readonly flow: ReturnType<typeof buildRallyPathFlow>;
  readonly teams: readonly { id: string; name: string }[];
  readonly nodeId?: string;
  readonly setNodeId: (id: string) => void;
  readonly onLink: (link: FlowLink) => void;
}) {
  const first = flow.nodes.find((node) => node.depth === 0);
  const current = flow.nodes.find((node) => node.id === (nodeId ?? first?.id));
  const outgoing = current
    ? flow.links
        .filter((link) => link.fromNodeId === current.id)
        .sort((left, right) => right.count - left.count)
    : [];
  return (
    <div className="rally-flow-mobile" aria-label="Navegação móvel dos caminhos">
      <p className="rally-flow-breadcrumb">
        {current?.state ? stateText(current.state, teams) : 'Situação inicial'}
      </p>
      <div className="rally-flow-mobile-current">
        {current?.state ? stateText(current.state, teams) : 'Outros caminhos'} · n=
        {current?.count ?? 0}
      </div>
      {outgoing.length === 0 ? (
        <p className="flow-muted">Este ramo termina aqui.</p>
      ) : (
        outgoing.map((link) => {
          const target = flow.nodes.find((node) => node.id === link.toNodeId);
          return (
            <div className="rally-mobile-branch" key={link.id}>
              <div className="rally-mobile-bar">
                <span style={{ width: `${Math.max(6, link.localProbability * 100)}%` }} />
              </div>
              <span>
                {link.count}/{link.prefixCount} · {wholePercent(link.localProbability)} ·{' '}
                {target?.state ? stateText(target.state, teams) : 'Outros caminhos'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onLink(link);
                  setNodeId(link.toNodeId);
                }}
              >
                Avançar
              </button>
            </div>
          );
        })
      )}
      {current && current.depth > 0 && (
        <button className="button ghost" type="button" onClick={() => setNodeId(first?.id ?? '')}>
          Voltar ao início
        </button>
      )}
    </div>
  );
}

function CourtExplorer({
  occurrences,
  role,
  mode,
  showAllTrajectories,
  zoneSystem,
  teams,
  focusTeamId,
  selectedZone,
  onSelectZone,
  onSelectOccurrence,
  onShowAllTrajectories,
}: {
  readonly occurrences: readonly RallyPathOccurrence[];
  readonly role: SpatialRole;
  readonly mode: CourtMode;
  readonly showAllTrajectories: boolean;
  readonly zoneSystem?: ZoneSystemProfile;
  readonly teams: readonly { id: string; name: string }[];
  readonly focusTeamId: string;
  readonly selectedZone: string;
  readonly onSelectZone: (zone: string) => void;
  readonly onSelectOccurrence: (occurrence: RallyPathOccurrence) => void;
  readonly onShowAllTrajectories: (showAll: boolean) => void;
}) {
  const qualityValues = [
    ...new Set(occurrences.map((occurrence) => qualityKey(occurrence.contact.quality))),
  ].sort();
  const candidate =
    mode === 'trajectories'
      ? occurrences.filter(
          (occurrence) => occurrence.contact.spatial.origin && occurrence.contact.spatial.target,
        )
      : occurrences;
  const visible =
    mode === 'trajectories' && !showAllTrajectories
      ? candidate.slice(-MAX_TRAJECTORIES)
      : candidate;
  const hasOutside = occurrences.some(
    (occurrence) =>
      (role === 'origin' ? occurrence.contact.spatial.origin : occurrence.contact.spatial.target)
        ?.surface === 'outZone',
  );
  const regionIds = [
    ...new Set(
      occurrences
        .map((occurrence) =>
          role === 'origin'
            ? occurrence.contact.spatial.originRegionId
            : occurrence.contact.spatial.targetRegionId,
        )
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const zones =
    zoneSystem?.zones.filter((zone) => regionIds.includes(zone.id)) ??
    regionIds.map((id) => ({ id, name: `Zona ${id}` }));
  return (
    <div className="rally-court-wrap">
      <div className="rally-court-toolbar">
        <div
          className="rally-court-zone-list"
          aria-label={`Filtrar ${role === 'origin' ? 'origem' : 'destino'} por zona`}
        >
          <button
            type="button"
            className={selectedZone === '' ? 'active' : ''}
            onClick={() => onSelectZone('')}
          >
            Todas
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              className={selectedZone === zone.id ? 'active' : ''}
              onClick={() => onSelectZone(zone.id)}
            >
              {zone.name}
            </button>
          ))}
          {hasOutside && (
            <button
              type="button"
              className={selectedZone === OUTSIDE_ZONE ? 'active' : ''}
              onClick={() => onSelectZone(OUTSIDE_ZONE)}
            >
              Fora
            </button>
          )}
        </div>
        <span className="rally-court-orientation">
          {teamName(teams, focusTeamId)} à esquerda ·{' '}
          {teams.find((team) => team.id !== focusTeamId)?.name ?? 'adversário'} à direita
        </span>
      </div>
      <svg
        className="rally-court"
        viewBox="0 0 200 100"
        role="img"
        aria-label={`Quadra proporcional com ações iniciais em ${role === 'origin' ? 'origem' : 'destino'}`}
      >
        <rect className="rally-court-floor" x="0" y="0" width="200" height="100" />
        <line className="rally-court-attack-line" x1="66.666" y1="0" x2="66.666" y2="100" />
        <line className="rally-court-net" x1="100" y1="0" x2="100" y2="100" />
        <line className="rally-court-attack-line" x1="133.333" y1="0" x2="133.333" y2="100" />
        {zoneSystem?.zones.map((zone) =>
          zone.x !== undefined && zone.y !== undefined ? (
            <text
              key={zone.id}
              className="rally-court-zone-label"
              x={zone.x * 200}
              y={zone.y * 100 + 2}
            >
              {zone.id}
            </text>
          ) : null,
        )}
        {mode === 'trajectories' &&
          visible.map((occurrence) => {
            const origin = occurrence.contact.spatial.origin;
            const target = occurrence.contact.spatial.target;
            if (!origin || !target) return null;
            const index = qualityColorIndex(occurrence.contact.quality, qualityValues);
            return (
              <line
                key={occurrence.id}
                className={`rally-court-trajectory quality-${index}`}
                x1={origin.x * 200}
                y1={origin.y * 100}
                x2={target.x * 200}
                y2={target.y * 100}
                onClick={() => onSelectOccurrence(occurrence)}
              >
                <title>{occurrenceText(occurrence, teams)}</title>
              </line>
            );
          })}
        {mode === 'actions' &&
          visible.map((occurrence) => {
            const point =
              role === 'origin'
                ? occurrence.contact.spatial.origin
                : occurrence.contact.spatial.target;
            if (!point || (point.surface ?? 'court') !== 'court') return null;
            const x = point.x * 200;
            const y = point.y * 100;
            const index = qualityColorIndex(occurrence.contact.quality, qualityValues);
            return (
              <g
                key={occurrence.id}
                className={`rally-court-marker quality-${index}`}
                role="button"
                tabIndex={0}
                aria-label={`${occurrenceText(occurrence, teams)} · ${role === 'origin' ? 'origem' : 'destino'}`}
                onClick={() => onSelectOccurrence(occurrence)}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectOccurrence(occurrence);
                }}
              >
                <circle cx={x} cy={y} r="3" />
                <title>{occurrenceText(occurrence, teams)}</title>
              </g>
            );
          })}
        <rect className="rally-court-border" x="0" y="0" width="200" height="100" />
      </svg>
      <div className="rally-court-meta">
        <span>
          {mode === 'trajectories'
            ? `${visible.length} de ${candidate.length} trajetórias`
            : `${countCoordinates(occurrences, role)} de ${occurrences.length} ações iniciais têm ${role === 'origin' ? 'origem' : 'destino'} registrada`}
        </span>
        <span>Contatos sem posição permanecem no foco geral.</span>
      </div>
      {mode === 'trajectories' && candidate.length > MAX_TRAJECTORIES && (
        <div className="rally-court-trajectory-actions">
          <p className="flow-muted">
            {showAllTrajectories
              ? 'Todas as trajetórias estão visíveis; as métricas usam o conjunto completo.'
              : 'Mostrando as 30 mais recentes; as métricas usam todas as trajetórias.'}
          </p>
          <button
            className="button ghost"
            type="button"
            onClick={() => onShowAllTrajectories(!showAllTrajectories)}
          >
            {showAllTrajectories ? 'Mostrar 30 mais recentes' : 'Ver todas'}
          </button>
        </div>
      )}
      <div className="rally-quality-legend" aria-label="Legenda das qualidades">
        {qualityValues.map((quality, index) => (
          <span key={quality}>
            <i className={`quality-swatch quality-${index % 6}`} />
            {qualityLabel(occurrences[0]?.contact.skill ?? 'attack', quality)}
          </span>
        ))}
      </div>
    </div>
  );
}

function RallyDetails({
  occurrences,
  teams,
  players,
  selectedIds,
}: {
  readonly occurrences: readonly RallyPathOccurrence[];
  readonly teams: readonly { id: string; name: string }[];
  readonly players: readonly { id: string; teamId: string; number: number; name: string }[];
  readonly selectedIds: readonly string[];
}) {
  const visible = selectedIds.length
    ? occurrences.filter((occurrence) => selectedIds.includes(occurrence.id))
    : occurrences;
  const playerLabel = (id?: string) => {
    if (!id) return 'Sem atleta';
    const player = players.find((candidate) => candidate.id === id);
    return player
      ? `#${String(player.number).padStart(2, '0')} ${player.name}`
      : 'Atleta identificado';
  };
  return (
    <section className="rally-evidence" aria-labelledby="rally-evidence-title">
      <div>
        <h4 id="rally-evidence-title">Rallies correspondentes</h4>
        <p>
          {visible.length} ocorrências ·{' '}
          {new Set(visible.map((occurrence) => occurrence.rally.rallyId)).size} rallies distintos.
          Repetições permanecem dentro do mesmo rally.
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="flow-muted">Nenhum registro corresponde à ligação selecionada.</p>
      ) : (
        <div className="rally-evidence-list">
          {visible.map((occurrence) => (
            <article key={occurrence.id} className="rally-evidence-item">
              <header>
                <strong>Set {occurrence.rally.setNumber}</strong>
                <span>
                  Placar anterior:{' '}
                  {occurrence.contact.scoreBefore
                    ? `${occurrence.contact.scoreBefore.teamA} × ${occurrence.contact.scoreBefore.teamB}`
                    : 'não conhecido'}
                </span>
              </header>
              <p>
                {occurrence.rally.contacts
                  .map(
                    (contact) =>
                      `${teamName(teams, contact.teamId)} · ${skillLabel(contact.skill)} ${qualityText(contact.skill, contact.quality)} · ${playerLabel(contact.playerId)}`,
                  )
                  .join(' → ')}
              </p>
              <small>
                {occurrence.rally.terminal
                  ? `Vencedor: ${teamName(teams, occurrence.rally.terminal.winnerTeamId)} · ${occurrence.rally.terminal.cause ?? 'desfecho registrado'}`
                  : 'Desfecho não registrado'}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TechnicalDetails({
  model,
  teams,
}: {
  readonly model: ReturnType<typeof buildRallyPathModel>;
  readonly teams: readonly { id: string; name: string }[];
}) {
  return (
    <details className="rally-technical-details">
      <summary>Dados completos e como calculamos</summary>
      <div className="rally-technical-content">
        <section>
          <h4>Como calculamos</h4>
          <p>
            O estado é equipe executora + fundamento + qualidade. A cadeia é de primeira ordem: cada
            saída adjacente é contada, incluindo a última ação até o terminal real. O potencial é a
            absorção em Ponto {teamName(teams, model.referenceTeamId)}; não é a frequência de
            rallies vencidos que contêm o estado.
          </p>
          <p>
            O recorte define a primeira transição. As etapas seguintes usam as transições do
            contexto selecionado. O gráfico mostra prefixos observados reais; duas colunas futuras
            não transformam o modelo em segunda ordem.
          </p>
          <p>
            Próximas ações registradas podem refletir cobertura parcial. Rallies incompletos ou
            conflitantes continuam auditáveis, mas não entram na estimativa.
          </p>
        </section>
        <dl className="rally-audit-summary">
          <div>
            <dt>Dimensão transitória</dt>
            <dd>{model.matrixDimension} estados</dd>
          </div>
          <div>
            <dt>Rallies no contexto</dt>
            <dd>{model.contextRallyCount}</dd>
          </div>
          <div>
            <dt>Rallies elegíveis</dt>
            <dd>{model.eligibleRallies.length}</dd>
          </div>
          <div>
            <dt>Excluídos do modelo</dt>
            <dd>{model.excludedRallies.length}</dd>
          </div>
          <div>
            <dt>Status da absorção</dt>
            <dd>{model.status === 'available' ? 'Disponível' : 'Indisponível'}</dd>
          </div>
        </dl>
        <div className="rally-technical-table-wrap">
          <table className="analytics-table" aria-label="Matriz técnica de transições">
            <thead>
              <tr>
                <th>Estado de origem</th>
                <th>Estado seguinte</th>
                <th>Saídas</th>
                <th>Probabilidade de transição</th>
              </tr>
            </thead>
            <tbody>
              {model.transitions.map((transition) => (
                <tr key={transition.id}>
                  <th>{stateText(transition.from, teams)}</th>
                  <td>{stateText(transition.to, teams)}</td>
                  <td>{transition.count}</td>
                  <td>{percent(transition.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {model.transitions.length === 0 && (
            <p className="flow-muted">Não há transições elegíveis para exibir.</p>
          )}
        </div>
      </div>
    </details>
  );
}

export function SequenceAnalyticsPanel({
  analytics,
  teams,
  teamId,
  players = [],
}: SequenceAnalyticsPanelProps) {
  const rallies = useMemo(
    () =>
      analytics.pathRallies ??
      analytics.teams.find((team) => team.teamId === teamId)?.pathRallies ??
      [],
    [analytics.pathRallies, analytics.teams, teamId],
  );
  const [activeTeamId, setActiveTeamId] = useState(teamId);
  const [skill, setSkill] = useState<RallyPathSkill>('attack');
  const [quality, setQuality] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [rotation, setRotation] = useState('');
  const [setFilter, setSetFilter] = useState<SetFilter>('all');
  const [horizon, setHorizon] = useState<1 | 2>(1);
  const [spatialRole, setSpatialRole] = useState<SpatialRole>('origin');
  const [spatialRegionId, setSpatialRegionId] = useState('');
  const [courtMode, setCourtMode] = useState<CourtMode>('actions');
  const [showAllTrajectories, setShowAllTrajectories] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [mobileNodeId, setMobileNodeId] = useState<string>();
  const [evidenceIds, setEvidenceIds] = useState<readonly string[]>([]);
  const [previousFocus, setPreviousFocus] = useState<FocusSnapshot>();
  const [focusMessage, setFocusMessage] = useState('');
  const availableSets = useMemo(
    () => [...new Set(rallies.map((rally) => rally.setNumber))].sort((a, b) => a - b),
    [rallies],
  );
  const availableSkillValues = useMemo(
    () => initialSkills(rallies, activeTeamId),
    [activeTeamId, rallies],
  );
  const effectiveSkill = availableSkillValues.includes(skill)
    ? skill
    : (availableSkillValues[0] ?? skill);
  const model = useMemo(
    () => buildRallyPathModel(rallies, activeTeamId, setFilter === 'all' ? undefined : setFilter),
    [activeTeamId, rallies, setFilter],
  );
  const qualityValues = useMemo(
    () => initialQualityValues(model.eligibleRallies, activeTeamId, effectiveSkill),
    [activeTeamId, effectiveSkill, model.eligibleRallies],
  );
  const effectiveQuality = quality && qualityValues.includes(quality) ? quality : '';
  const focusFilters = useMemo<RallyPathFocusFilters>(
    () => ({
      teamId: activeTeamId,
      skill: effectiveSkill,
      ...(effectiveQuality ? { quality: effectiveQuality } : {}),
      ...(playerId ? { playerId } : {}),
      ...(rotation ? { rotation } : {}),
      spatialRole,
      ...(spatialRegionId ? { spatialRegionId } : {}),
    }),
    [
      activeTeamId,
      effectiveQuality,
      effectiveSkill,
      playerId,
      rotation,
      spatialRegionId,
      spatialRole,
    ],
  );
  const focus = useMemo(() => selectRallyPathFocus(model, focusFilters), [focusFilters, model]);
  const flow = useMemo(() => buildRallyPathFlow(focus, model, horizon), [focus, horizon, model]);
  const qualityComparison = useMemo(
    () => compareRallyPathQualities(model, focusFilters),
    [focusFilters, model],
  );
  const focusedPlayers = useMemo(
    () =>
      [
        ...new Set(
          model.eligibleRallies.flatMap((rally) =>
            rally.contacts
              .filter(
                (contact) =>
                  contact.teamId === activeTeamId &&
                  contact.skill === effectiveSkill &&
                  contact.playerId,
              )
              .map((contact) => contact.playerId!),
          ),
        ),
      ].sort(),
    [activeTeamId, effectiveSkill, model.eligibleRallies],
  );
  const rotations = useMemo(
    () =>
      [
        ...new Set(
          model.eligibleRallies.flatMap((rally) =>
            rally.contacts
              .filter(
                (contact) =>
                  contact.teamId === activeTeamId &&
                  contact.skill === effectiveSkill &&
                  contact.rotation !== undefined,
              )
              .map((contact) => String(contact.rotation)),
          ),
        ),
      ].sort(),
    [activeTeamId, effectiveSkill, model.eligibleRallies],
  );
  const selectedNode = flow.nodes.find((node) => node.id === selectedNodeId);
  const selectedLink = flow.links.find((link) => link.id === selectedLinkId);
  const selectedEvidenceIds =
    selectedLink?.occurrenceIds ?? selectedNode?.occurrenceIds ?? evidenceIds;
  const selectedEvidence = focus.occurrences.filter((occurrence) =>
    selectedEvidenceIds.includes(occurrence.id),
  );
  const focusCoordinateCount = countCoordinates(focus.occurrences, spatialRole);

  function updateTeam(value: string) {
    setActiveTeamId(value);
    setQuality('');
    setPlayerId('');
    setRotation('');
    setSpatialRegionId('');
    setSelectedNodeId(undefined);
    setSelectedLinkId(undefined);
  }
  function updateSkill(value: RallyPathSkill) {
    setSkill(value);
    setQuality('');
    setPlayerId('');
    setRotation('');
    setSpatialRegionId('');
  }
  function selectNode(node: FlowNode) {
    setSelectedNodeId(node.id);
    setSelectedLinkId(undefined);
    setEvidenceIds(node.occurrenceIds);
  }
  function selectLink(link: FlowLink) {
    setSelectedLinkId(link.id);
    setSelectedNodeId(undefined);
    setEvidenceIds(link.occurrenceIds);
  }
  function exploreNode(node: FlowNode) {
    if (!node.state || node.state.terminal || node.state.skill === 'terminal') return;
    setPreviousFocus(focusSnapshot(focusFilters, setFilter));
    setActiveTeamId(node.state.teamId);
    setSkill(node.state.skill);
    setQuality(qualityKey(node.state.quality));
    setPlayerId('');
    setRotation('');
    setSpatialRegionId('');
    setFocusMessage(
      `Novo foco: ${stateText(node.state, teams)}. Filtros específicos foram limpos.`,
    );
  }
  function restorePreviousFocus() {
    if (!previousFocus) return;
    setActiveTeamId(previousFocus.teamId);
    setSkill(previousFocus.skill);
    setQuality(previousFocus.quality);
    setPlayerId(previousFocus.playerId);
    setRotation(previousFocus.rotation);
    setSpatialRole(previousFocus.spatialRole);
    setSpatialRegionId(previousFocus.spatialRegionId);
    setSetFilter(previousFocus.setFilter);
    setPreviousFocus(undefined);
    setFocusMessage('Foco anterior restaurado.');
  }

  if (rallies.length === 0)
    return (
      <section className="rally-explorer rally-empty" aria-labelledby="rally-explorer-title">
        <p className="eyebrow">Análise</p>
        <h3 id="rally-explorer-title">Caminhos do rally</h3>
        <p>
          Ainda não há rallies registrados para explorar. Registre ações com um desfecho conhecido
          para construir os caminhos.
        </p>
      </section>
    );
  const headline =
    focus.rallyIds.length < 10
      ? 'Poucos registros para destacar uma estimativa'
      : wholePercent(focus.potential);
  const comparisonNote = qualityComparison.some((item) => item.rallies < 10)
    ? 'Há grupos com Poucos registros.'
    : '';
  const initialState = flow.nodes.find((node) => node.depth === 0);
  const description = focus.inputDistribution[0]
    ? `Em ${focus.inputDistribution[0].count} de ${focus.occurrenceCount} saídas registradas, esta ação foi seguida por ${stateText(focus.inputDistribution[0].to, teams)}.`
    : '';
  return (
    <section className="rally-explorer" aria-labelledby="rally-explorer-title">
      <header className="rally-explorer-heading">
        <div>
          <p className="eyebrow">Explorador de Markov</p>
          <h3 id="rally-explorer-title">Caminhos do rally</h3>
          <p>Explore o que acontece depois de cada ação.</p>
        </div>
        <label>
          Equipe de referência
          <select
            aria-label="Equipe de referência"
            value={activeTeamId}
            onChange={(event) => updateTeam(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set
          <select
            aria-label="Set do contexto"
            value={String(setFilter)}
            onChange={(event) =>
              setSetFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
            }
          >
            <option value="all">Todos os sets</option>
            {availableSets.map((set) => (
              <option key={set} value={set}>
                Set {set}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="rally-filter-bar" aria-label="Foco da investigação">
        <label>
          Equipe executora
          <select value={activeTeamId} onChange={(event) => updateTeam(event.target.value)}>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fundamento
          <select
            value={effectiveSkill}
            onChange={(event) => updateSkill(event.target.value as RallyPathSkill)}
          >
            {(availableSkillValues.length ? availableSkillValues : SKILL_OPTIONS).map((value) => (
              <option key={value} value={value}>
                {skillLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Qualidade
          <select value={effectiveQuality} onChange={(event) => setQuality(event.target.value)}>
            <option value="">Todas as qualidades</option>
            {qualityValues.map((value) => (
              <option key={value} value={value}>
                {qualityLabel(effectiveSkill, value)}
              </option>
            ))}
          </select>
        </label>
        <details className="rally-more-filters">
          <summary>Mais filtros</summary>
          <label>
            Atleta
            <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
              <option value="">Todos os atletas</option>
              {focusedPlayers.map((id) => (
                <option key={id} value={id}>
                  {players.find((player) => player.id === id)?.name ?? 'Atleta identificado'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rotação
            <select value={rotation} onChange={(event) => setRotation(event.target.value)}>
              <option value="">Todas as rotações</option>
              {rotations.map((value) => (
                <option key={value} value={value}>
                  {value.startsWith('P') ? value : `P${value}`}
                </option>
              ))}
            </select>
          </label>
        </details>
      </div>
      {focusMessage && (
        <p className="rally-focus-message" role="status">
          {focusMessage}{' '}
          {previousFocus && (
            <button type="button" onClick={restorePreviousFocus}>
              Voltar ao foco anterior
            </button>
          )}
        </p>
      )}
      <section className="rally-summary" aria-label="Resumo do foco">
        <article className="rally-summary-potential">
          <small>Potencial do rally</small>
          <strong>{headline}</strong>
          <span>
            {focus.rallyIds.length >= 10 && 'Estimativa exploratória · '}
            Chance estimada de sua equipe terminar com o ponto a partir deste estado.
          </span>
          {focus.potential !== null && (
            <div className="rally-potential-bar">
              <i style={{ width: `${focus.potential * 100}%` }} />
            </div>
          )}
          <em>
            <span>
              {focus.potential === null
                ? 'Estimativa indisponível neste modelo.'
                : `Detalhe: ${percent(focus.potential)} · ${focus.occurrenceCount} ocorrências`}
            </span>
            {comparisonNote && <span> {comparisonNote}</span>}
          </em>
        </article>
        <article>
          <small>Rallies vencidos nos registros</small>
          <strong>
            {focus.rallyIds.length ? `${focus.observedWins}/${focus.rallyIds.length}` : '—'}
          </strong>
          <span>{percent(focus.observedPointRate, 0)} observado · rallies distintos</span>
        </article>
        <article>
          <small>Base</small>
          <strong>{focus.occurrenceCount} ocorrências</strong>
          <span>
            {focus.rallyIds.length} rallies no foco · contexto: {model.eligibleRallies.length}{' '}
            concluídos · {model.excludedRallies.length} excluídos
          </span>
        </article>
      </section>
      {description && (
        <p className="rally-auto-description">
          {description} A leitura é descritiva e não indica causa.
        </p>
      )}
      <section className="rally-flow-section" aria-labelledby="rally-flow-title">
        <div className="rally-section-heading">
          <div>
            <p className="eyebrow">Protagonista</p>
            <h4 id="rally-flow-title">Próximas ações registradas</h4>
            <p>
              Faixas mostram ocorrências observadas; o selo do nó mostra o potencial calculado pela
              cadeia do contexto.
            </p>
          </div>
          <div className="rally-horizon-toggle" role="group" aria-label="Horizonte visível">
            <button type="button" aria-pressed={horizon === 1} onClick={() => setHorizon(1)}>
              1 contato
            </button>
            <button type="button" aria-pressed={horizon === 2} onClick={() => setHorizon(2)}>
              2 contatos
            </button>
          </div>
        </div>
        {model.status !== 'available' ? (
          <div className="rally-unavailable">
            <strong>Estimativa indisponível</strong>
            <span>
              Os caminhos observados continuam acessíveis, mas a cadeia não atingiu um terminal
              resolúvel ou não convergiu.
            </span>
          </div>
        ) : flow.nodes.length ? (
          <>
            <div className="rally-flow-desktop">
              <FlowSvg
                flow={flow}
                teams={teams}
                selectedNodeId={selectedNodeId}
                selectedLinkId={selectedLinkId}
                onNode={selectNode}
                onLink={selectLink}
              />
            </div>
            <MobileFlow
              flow={flow}
              teams={teams}
              nodeId={mobileNodeId ?? initialState?.id}
              setNodeId={setMobileNodeId}
              onLink={selectLink}
            />
          </>
        ) : (
          <p className="flow-muted">Sem caminhos observáveis neste recorte.</p>
        )}
        {(selectedNode || selectedLink) && (
          <div className="rally-selection-detail" role="status">
            <strong>{selectedLink ? 'Ligação selecionada' : 'Estado selecionado'}</strong>
            <span>
              {selectedLink
                ? `${selectedLink.count}/${selectedLink.prefixCount} ocorrências · ${percent(selectedLink.localProbability)} local · ${new Set(selectedEvidence.map((occurrence) => occurrence.rally.rallyId)).size} rallies distintos`
                : selectedNode?.state
                  ? `${stateText(selectedNode.state, teams)} · potencial ${percent(selectedNode.potential)}`
                  : 'Outros caminhos · sem potencial próprio'}
            </span>
            {selectedNode?.state && !selectedNode.state.terminal && (
              <button
                className="button secondary"
                type="button"
                onClick={() => exploreNode(selectedNode)}
              >
                Explorar a partir deste estado
              </button>
            )}
            {selectedNode?.kind === 'other' && (
              <span>
                “Outros” agrupa o restante; não é estado da matriz e não recebe V próprio.
              </span>
            )}
          </div>
        )}
      </section>
      <section className="rally-investigation" aria-labelledby="rally-investigation-title">
        <div className="rally-section-heading">
          <div>
            <p className="eyebrow">Investigação</p>
            <h4 id="rally-investigation-title">Onde começa este caminho?</h4>
            <p>
              A quadra filtra somente a ação inicial; os contatos intermediários permanecem nos
              caminhos.
            </p>
          </div>
          <div className="rally-court-controls">
            <label>
              Posição
              <select
                value={spatialRole}
                onChange={(event) => {
                  setSpatialRole(event.target.value as SpatialRole);
                  setSpatialRegionId('');
                }}
              >
                <option value="origin">Origem</option>
                <option value="target">Destino</option>
              </select>
            </label>
            <div className="rally-court-mode" role="group" aria-label="Modo da quadra">
              <button
                type="button"
                aria-pressed={courtMode === 'actions'}
                onClick={() => setCourtMode('actions')}
              >
                Ações
              </button>
              <button
                type="button"
                aria-pressed={courtMode === 'trajectories'}
                onClick={() => setCourtMode('trajectories')}
              >
                Trajetórias
              </button>
            </div>
          </div>
        </div>
        <div className="rally-investigation-grid">
          <CourtExplorer
            occurrences={focus.occurrences}
            role={spatialRole}
            mode={courtMode}
            showAllTrajectories={showAllTrajectories}
            zoneSystem={analytics.zoneSystem}
            teams={teams}
            focusTeamId={activeTeamId}
            selectedZone={spatialRegionId}
            onSelectZone={setSpatialRegionId}
            onSelectOccurrence={(occurrence) => {
              setEvidenceIds([occurrence.id]);
              setSelectedLinkId(undefined);
              setSelectedNodeId(undefined);
            }}
            onShowAllTrajectories={setShowAllTrajectories}
          />
          <section className="rally-quality-comparison" aria-labelledby="quality-comparison-title">
            <h5 id="quality-comparison-title">Comparação por qualidade</h5>
            <p>
              Mesmos filtros, removendo somente qualidade. Diferença = potencial do grupo −
              referência, sem interpretação causal.
            </p>
            {qualityComparison.length === 0 ? (
              <p className="flow-muted">Sem qualidades observadas neste fundamento.</p>
            ) : (
              <div className="rally-quality-list">
                {qualityComparison.map((item) => (
                  <button
                    type="button"
                    key={item.quality ?? MISSING_QUALITY}
                    className={
                      effectiveQuality === (item.quality ?? MISSING_QUALITY) ? 'selected' : ''
                    }
                    onClick={() => setQuality(item.quality ?? MISSING_QUALITY)}
                  >
                    <span>
                      <i
                        className={`quality-swatch quality-${qualityColorIndex(
                          item.quality,
                          qualityComparison.map((entry) => qualityKey(entry.quality)),
                        )}`}
                      />
                      {qualityLabel(effectiveSkill, item.quality ?? MISSING_QUALITY)}
                    </span>
                    <b>{item.potential === null ? '—' : percent(item.potential)}</b>
                    <span className="rally-quality-meter" aria-hidden="true">
                      <i
                        style={{
                          width: item.potential === null ? '0%' : `${item.potential * 100}%`,
                        }}
                      />
                    </span>
                    <small>
                      {item.occurrences} ocorrências · {item.rallies} rallies · observado{' '}
                      {percent(item.observedPointRate)}
                      {item.differenceVsReference === null
                        ? ''
                        : ` · ${item.differenceVsReference >= 0 ? '+' : ''}${percent(item.differenceVsReference)} vs ref.`}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
        <p className="rally-coverage-note">
          {focusCoordinateCount} de {focus.occurrenceCount} ações iniciais têm{' '}
          {spatialRole === 'origin' ? 'origem' : 'destino'} registrada.{' '}
          {focus.occurrenceCount - focusCoordinateCount} sem posição continuam no foco geral e só
          saem quando uma zona é selecionada.
        </p>
      </section>
      <RallyDetails
        occurrences={focus.occurrences}
        teams={teams}
        players={players}
        selectedIds={selectedEvidenceIds}
      />
      <TechnicalDetails model={model} teams={teams} />
    </section>
  );
}
