import { contactQuality } from '../../../domain/scout/entities/ContactQuality';
import { compareRallyPathRegions } from '../../../domain/analytics/markov/SpatialPathComparison';
import { VolleyballCourtMarkings } from '../../components/VolleyballCourtZones';
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
import { MacrocomplexGraph } from './MacrocomplexGraph';
import { MarkovTree, type MarkovNode, type MarkovLink } from '../../../components/analysis/MarkovTree';
import {
  VolleyballCourtPro,
  type CourtEventPoint,
  type CourtVector,
  type DirectionalSummaryItem,
} from '../../../components/court/VolleyballCourtPro';
import { WinProbabilityChart } from '../../../components/analysis/WinProbabilityChart';
import type { WinProbabilityReport } from '../../../application/analytics/WinProbabilityService';
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
  readonly winProbability?: WinProbabilityReport;
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
  return quality && quality !== MISSING_QUALITY ? contactQuality(quality) ?? quality : '—';
}

function stateText(
  state: PathStateDescriptor,
  teams: readonly { id: string; name: string }[],
): string {
  const name = teams.find((team) => team.id === state.teamId)?.name ?? state.teamId;
  if (state.terminal) return `Ponto ${name}`;
  const location = state.originRegionId || state.targetRegionId
    ? ` · Z${state.originRegionId ?? '?'}→Z${state.targetRegionId ?? '?'}` : '';
  const response = pathStateLabel(state, name, skillLabel(state.skill), qualityText(state.skill, state.quality)) + location;
  return state.exchange
    ? `${teamName(teams, state.exchange.teamId)} · ${skillLabel(state.exchange.skill)}${state.exchange.originRegionId || state.exchange.targetRegionId ? ` · Z${state.exchange.originRegionId ?? '?'}→Z${state.exchange.targetRegionId ?? '?'}` : ''} / ${response}`
    : response;
}

function stateLines(
  state: PathStateDescriptor,
  teams: readonly { id: string; name: string }[],
): readonly string[] {
  const name = teams.find((team) => team.id === state.teamId)?.name ?? state.teamId;
  return state.terminal
    ? [`Ponto ${name}`]
    : [state.exchange ? `${skillLabel(state.exchange.skill)} ${state.exchange.originRegionId ?? '?'}→${state.exchange.targetRegionId ?? '?'} / ${skillLabel(state.skill)}` : name,
      `${state.exchange ? `${name} · ` : `${skillLabel(state.skill)} · `}${shortQuality(state.quality)}${state.originRegionId || state.targetRegionId ? ` · ${state.originRegionId ?? '?'}→${state.targetRegionId ?? '?'}` : ''}`];
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
  const renderedNodes: FlowNode[] = [];
  const terminalLeader = new Map<string, string>();

  columns.forEach((nodes, depth) => {
    let rowIndex = 0;
    nodes.forEach((node) => {
      if (node.state?.terminal) {
        const termKey = `${depth}:${node.state.teamId}`;
        const existingLeaderId = terminalLeader.get(termKey);
        if (existingLeaderId) {
          positions.set(node.id, positions.get(existingLeaderId)!);
          const leaderIdx = renderedNodes.findIndex((n) => n.id === existingLeaderId);
          if (leaderIdx >= 0) {
            renderedNodes[leaderIdx] = {
              ...renderedNodes[leaderIdx],
              count: renderedNodes[leaderIdx].count + node.count,
            };
          }
          return;
        }
        terminalLeader.set(termKey, node.id);
      }
      positions.set(node.id, { x: 20 + depth * columnGap, y: 30 + rowIndex * 90 });
      renderedNodes.push({ ...node });
      rowIndex++;
    });
  });

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
            {depth === 0 ? 'Situação inicial' : `${depth} etapa${depth > 1 ? 's' : ''} depois`}
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
                strokeWidth={Math.max(2, Math.min(8, 2 + (link.count / maxLinkCount) * 8))}
              />
              <rect
                x={(x1 + x2) / 2 - 34}
                y={(y1 + y2) / 2 - 13}
                width="68"
                height="16"
                rx="4"
                fill="#0B0F19"
                stroke="#334155"
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 2}
                textAnchor="middle"
              >{`${link.count}/${link.prefixCount} · ${wholePercent(link.localProbability)}`}</text>
            </g>
          );
        })}
      </g>
      <g className="rally-flow-nodes">
        {renderedNodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const lines = (node.state ? stateLines(node.state, teams) : ['Outros caminhos']).map(line => line.length > 26 ? `${line.slice(0, 25)}…` : line);
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
              <title>{node.state ? stateText(node.state, teams) : 'Outros caminhos'}</title>
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
        <VolleyballCourtMarkings />
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
                      `${teamName(teams, contact.teamId)} · ${skillLabel(contact.skill)} ${qualityText(contact.skill, contact.quality)}${contact.qualitySource === 'response' ? ' (inferida da resposta)' : ''} · ${playerLabel(contact.playerId)}`,
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
            O estado inclui equipe, fundamento, qualidade e zonas de origem/destino. Saque–recepção e
            ataque–defesa consecutivos de adversários formam uma etapa conjunta, definida pela resposta.
            A cadeia conta a saída dessa troca até a próxima etapa, incluindo o terminal real. O potencial é a
            absorção em Ponto {teamName(teams, model.referenceTeamId)}; não é a frequência de
            rallies vencidos que contêm o estado.
          </p>
          <p>
            O recorte define a primeira transição. As etapas seguintes usam as transições do
            contexto selecionado. O gráfico mostra prefixos observados reais; duas colunas futuras
            não transformam o modelo em segunda ordem.
          </p>
          <p>Quando o envio está sem nota ou neutro, a pressão é inferida da resposta:
            # → −, + → neutra, − → +, = → #. A evidência identifica a inferência;
            a nota original e o placar são preservados.</p>
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

export type PhaseFilter = 'all' | 'k1_sideout' | 'k2_breakpoint';

interface MarkovTreeResult {
  nodes: MarkovNode[];
  links: MarkovLink[];
  ralliesByNode: Map<string, RallyPathRally[]>;
  phaseCounts: { all: number; k1: number; k2: number };
}

function buildVolleyballMarkovTree(
  rallies: readonly RallyPathRally[],
  teamId: string,
  teams: readonly { id: string; name: string }[],
  setFilter: 'all' | number,
  phaseFilter: PhaseFilter = 'all',
): MarkovTreeResult {
  const team = teams.find((t) => t.id === teamId);
  const teamName = team?.name ?? 'Equipe';
  const opponentName = teams.find((t) => t.id !== teamId)?.name ?? 'Adversário';

  const setFilteredRallies = rallies.filter((r) => {
    if (setFilter !== 'all' && r.setNumber !== setFilter) return false;
    return true;
  });

  // Contagem de fases no set filtrado
  let countK1 = 0;
  let countK2 = 0;

  setFilteredRallies.forEach((r) => {
    const serve = r.contacts.find((c) => c.skill === 'serve');
    const ourRec = r.contacts.find((c) => c.teamId === teamId && c.skill === 'reception');
    const isOurServe = serve ? serve.teamId === teamId : false;
    const isOppServe = serve ? serve.teamId !== teamId : false;
    const firstContact = r.contacts[0];
    const isK1 = isOppServe || Boolean(ourRec) || (!isOurServe && firstContact?.teamId === teamId && firstContact?.skill !== 'serve');
    if (isK1) countK1++;
    else countK2++;
  });

  const phaseCounts = {
    all: setFilteredRallies.length,
    k1: countK1,
    k2: countK2,
  };

  const ralliesByNode = new Map<string, RallyPathRally[]>();
  const addRallyToNode = (nodeId: string, r: RallyPathRally) => {
    const list = ralliesByNode.get(nodeId) ?? [];
    list.push(r);
    ralliesByNode.set(nodeId, list);
  };

  const s1Counts: Record<string, { count: number; kills: number }> = {};
  const initS1 = (id: string) => {
    if (!s1Counts[id]) s1Counts[id] = { count: 0, kills: 0 };
  };

  const s2Counts: Record<string, { count: number; kills: number; errors: number; continuity: number }> = {
    p4: { count: 0, kills: 0, errors: 0, continuity: 0 },
    p3: { count: 0, kills: 0, errors: 0, continuity: 0 },
    p2: { count: 0, kills: 0, errors: 0, continuity: 0 },
    p6: { count: 0, kills: 0, errors: 0, continuity: 0 },
  };

  const link1to2 = new Map<string, number>();
  const link2to3 = new Map<string, { kill: number; rally: number; error: number }>();
  const directLink1to3 = new Map<string, { kill: number; rally: number; error: number }>();

  let totalKills = 0;
  let totalContinuity = 0;
  let totalErrors = 0;

  const ralliesToProcess = setFilteredRallies.filter((r) => {
    if (!r.contacts.length) return false;
    const serve = r.contacts.find((c) => c.skill === 'serve');
    const ourRec = r.contacts.find((c) => c.teamId === teamId && c.skill === 'reception');
    const isOurServe = serve ? serve.teamId === teamId : false;
    const isOppServe = serve ? serve.teamId !== teamId : false;
    const firstContact = r.contacts[0];
    const isK1 = isOppServe || Boolean(ourRec) || (!isOurServe && firstContact?.teamId === teamId && firstContact?.skill !== 'serve');

    if (phaseFilter === 'k1_sideout' && !isK1) return false;
    if (phaseFilter === 'k2_breakpoint' && isK1) return false;
    return true;
  });

  ralliesToProcess.forEach((r) => {
    const contacts = r.contacts;
    const serve = contacts.find((c) => c.skill === 'serve');
    const ourRec = contacts.find((c) => c.teamId === teamId && c.skill === 'reception');
    const oppRec = contacts.find((c) => c.teamId !== teamId && c.skill === 'reception');
    const ourAttack = contacts.find((c) => c.teamId === teamId && c.skill === 'attack');
    const isOurServe = serve ? serve.teamId === teamId : false;
    const isOppServe = serve ? serve.teamId !== teamId : false;
    const firstContact = contacts[0];
    const isK1 = isOppServe || Boolean(ourRec) || (!isOurServe && firstContact?.teamId === teamId && firstContact?.skill !== 'serve');

    let s1Id = 'transition';

    if (isK1) {
      // Sideout / Nossa Recepção
      const q = ourRec?.quality;
      const targetRegion = ourRec?.spatial?.targetRegionId;
      const targetPt = ourRec?.spatial?.target;
      const isTargetZ3 = targetRegion === '3' || (targetPt && targetPt.x >= 0.30 && targetPt.x <= 0.70 && targetPt.y >= 0.30 && targetPt.y <= 0.70);
      const isTargetZ2or4 = targetRegion === '2' || targetRegion === '4';
      const isTargetDeep = targetRegion === '1' || targetRegion === '6' || targetRegion === '5' || targetRegion === '__outside__';
      const isCentralAttack = ourAttack && (ourAttack.spatial?.originRegionId === '3' || ourAttack.spatial?.targetRegionId === '3');
      const isWingAttack = ourAttack && (ourAttack.spatial?.originRegionId === '4' || ourAttack.spatial?.originRegionId === '2');
      const isFreeBall = contacts.some((c) => c.teamId === teamId && c.skill === 'free_ball');

      if (q === '#' || q === 'perfect' || q === 'excellent' || isTargetZ3 || (!ourRec && isCentralAttack)) {
        s1Id = 'rec_a';
      } else if (q === '+' || q === 'positive' || isTargetZ2or4 || (!ourRec && isWingAttack)) {
        s1Id = 'rec_b';
      } else if (q === '!' || q === '-' || q === 'broken' || q === 'poor' || isTargetDeep || isFreeBall) {
        s1Id = 'rec_c';
      } else {
        if (isCentralAttack) s1Id = 'rec_a';
        else if (isWingAttack) s1Id = 'rec_b';
        else s1Id = 'rec_c';
      }
    } else {
      // Breakpoint / Nosso Saque
      const isAce = (r.terminal?.winnerTeamId === teamId && (r.terminal.cause === 'ace' || contacts.length <= 2 || oppRec?.quality === '=')) || serve?.quality === '#';
      const isServeErr = (r.terminal?.winnerTeamId !== teamId && (contacts.length === 1 || r.terminal?.cause === 'fault' || r.terminal?.cause === 'out' || r.terminal?.cause === 'net')) || serve?.quality === '=';
      const oppRecTarget = oppRec?.spatial?.targetRegionId;
      const oppRecPt = oppRec?.spatial?.target;
      const oppBroken = oppRec?.quality === '!' || oppRec?.quality === '-' || oppRec?.quality === 'broken' || oppRec?.quality === 'poor';
      const oppTargetOutsideZ3 = (oppRecTarget && oppRecTarget !== '3') || (oppRecPt && (oppRecPt.x < 0.30 || oppRecPt.x > 0.70 || oppRecPt.y < 0.30 || oppRecPt.y > 0.70));
      const oppFreeBall = contacts.some((c) => c.teamId !== teamId && c.skill === 'free_ball');
      const oppErrorOrBlocked = (r.terminal?.winnerTeamId === teamId && contacts.length <= 4 && !isAce);

      if (phaseFilter === 'k2_breakpoint') {
        if (isAce) {
          s1Id = 'serve_ace';
        } else if (oppBroken || oppTargetOutsideZ3 || oppFreeBall || oppErrorOrBlocked || serve?.quality === '+') {
          s1Id = 'serve_plus';
        } else if (isServeErr) {
          s1Id = 'serve_reg';
        } else if (oppRec?.quality === '#' || oppRec?.quality === '+' || oppRecTarget === '3') {
          s1Id = 'serve_reg';
        } else {
          s1Id = 'transition';
        }
      } else {
        if (oppBroken || oppTargetOutsideZ3 || oppFreeBall || oppErrorOrBlocked || serve?.quality === '+' || isAce) {
          s1Id = 'serve_plus';
        } else {
          s1Id = 'transition';
        }
      }
    }

    initS1(s1Id);
    addRallyToNode(s1Id, r);

    // Stage 2: Distribuição do ataque
    let s2Id: 'p4' | 'p3' | 'p2' | 'p6' = 'p4';
    let hasStage2 = true;

    if (ourAttack) {
      const z = ourAttack.spatial?.originRegionId ?? ourAttack.spatial?.targetRegionId;
      if (z === '3') s2Id = 'p3';
      else if (z === '2' || z === '1') s2Id = 'p2';
      else if (z === '6' || z === '5') s2Id = 'p6';
      else s2Id = 'p4';
      addRallyToNode(s2Id, r);
    } else {
      hasStage2 = false;
    }

    // Stage 3: Desfecho do rali
    const isKill = r.terminal?.winnerTeamId === teamId;
    const isError = r.terminal?.winnerTeamId && r.terminal.winnerTeamId !== teamId;
    const outcomeType: 'kill' | 'rally' | 'error' = isKill ? 'kill' : isError ? 'error' : 'rally';

    if (outcomeType === 'kill') {
      totalKills++;
      s1Counts[s1Id].kills++;
      if (hasStage2) s2Counts[s2Id].kills++;
      addRallyToNode('terminal_kill', r);
    } else if (outcomeType === 'error') {
      totalErrors++;
      if (hasStage2) s2Counts[s2Id].errors++;
      addRallyToNode('terminal_error', r);
    } else {
      totalContinuity++;
      if (hasStage2) s2Counts[s2Id].continuity++;
      addRallyToNode('terminal_continuity', r);
    }

    s1Counts[s1Id].count++;
    if (hasStage2) {
      s2Counts[s2Id].count++;
      const key1to2 = `${s1Id}:${s2Id}`;
      link1to2.set(key1to2, (link1to2.get(key1to2) ?? 0) + 1);

      const curr2to3 = link2to3.get(s2Id) ?? { kill: 0, rally: 0, error: 0 };
      curr2to3[outcomeType]++;
      link2to3.set(s2Id, curr2to3);
    } else {
      const curr1to3 = directLink1to3.get(s1Id) ?? { kill: 0, rally: 0, error: 0 };
      curr1to3[outcomeType]++;
      directLink1to3.set(s1Id, curr1to3);
    }
  });

  const totalAnalyzed = ralliesToProcess.length || 1;
  const s1Nodes: MarkovNode[] = [];

  if (phaseFilter === 'k1_sideout') {
    s1Nodes.push(
      {
        id: 'rec_a',
        stage: 1,
        title: 'Passe A (Excelente #)',
        subtitle: 'Passe na mão (Z3) / 1º tempo',
        sampleN: s1Counts.rec_a?.count ?? 0,
        rate: s1Counts.rec_a?.count ? (s1Counts.rec_a.kills / s1Counts.rec_a.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'positive',
      },
      {
        id: 'rec_b',
        stage: 1,
        title: 'Passe B (Positivo +)',
        subtitle: 'Passe jogável nas pontas (P4/P2)',
        sampleN: s1Counts.rec_b?.count ?? 0,
        rate: s1Counts.rec_b?.count ? (s1Counts.rec_b.kills / s1Counts.rec_b.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'warning',
      },
      {
        id: 'rec_c',
        stage: 1,
        title: 'Passe C (Quebrado !)',
        subtitle: 'Passe afastado da rede (fundo)',
        sampleN: s1Counts.rec_c?.count ?? 0,
        rate: s1Counts.rec_c?.count ? (s1Counts.rec_c.kills / s1Counts.rec_c.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'negative',
      },
      {
        id: 'transition',
        stage: 1,
        title: 'Defesa na Virada',
        subtitle: 'Rali estendido no sideout',
        sampleN: s1Counts.transition?.count ?? 0,
        rate: s1Counts.transition?.count ? (s1Counts.transition.kills / s1Counts.transition.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'neutral',
      },
    );
  } else if (phaseFilter === 'k2_breakpoint') {
    s1Nodes.push(
      {
        id: 'serve_ace',
        stage: 1,
        title: 'Saque Ace (#)',
        subtitle: 'Ponto direto no saque',
        sampleN: s1Counts.serve_ace?.count ?? 0,
        rate: s1Counts.serve_ace?.count ? (s1Counts.serve_ace.kills / s1Counts.serve_ace.count) * 100 : 0,
        rateLabel: 'Ponto Direto',
        status: 'positive',
      },
      {
        id: 'serve_plus',
        stage: 1,
        title: 'Saque + (Quebrou Passe)',
        subtitle: 'Forçou recepção fora da Z3',
        sampleN: s1Counts.serve_plus?.count ?? 0,
        rate: s1Counts.serve_plus?.count ? (s1Counts.serve_plus.kills / s1Counts.serve_plus.count) * 100 : 0,
        rateLabel: 'Break Point',
        status: 'positive',
      },
      {
        id: 'serve_reg',
        stage: 1,
        title: 'Saque Tático / Regular',
        subtitle: 'Adversário jogou em sistema (Z3)',
        sampleN: s1Counts.serve_reg?.count ?? 0,
        rate: s1Counts.serve_reg?.count ? (s1Counts.serve_reg.kills / s1Counts.serve_reg.count) * 100 : 0,
        rateLabel: 'Break Point',
        status: 'warning',
      },
      {
        id: 'transition',
        stage: 1,
        title: 'Defesa & Contra-Ataque',
        subtitle: 'Transição após defesa de bola',
        sampleN: s1Counts.transition?.count ?? 0,
        rate: s1Counts.transition?.count ? (s1Counts.transition.kills / s1Counts.transition.count) * 100 : 0,
        rateLabel: 'Break Point',
        status: 'neutral',
      },
    );
  } else {
    s1Nodes.push(
      {
        id: 'rec_a',
        stage: 1,
        title: 'Passe A (Excelente #)',
        subtitle: 'Passe na mão (Z3) / 1º tempo',
        sampleN: s1Counts.rec_a?.count ?? 0,
        rate: s1Counts.rec_a?.count ? (s1Counts.rec_a.kills / s1Counts.rec_a.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'positive',
      },
      {
        id: 'rec_b',
        stage: 1,
        title: 'Passe B (Positivo +)',
        subtitle: 'Passe jogável nas pontas',
        sampleN: s1Counts.rec_b?.count ?? 0,
        rate: s1Counts.rec_b?.count ? (s1Counts.rec_b.kills / s1Counts.rec_b.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'warning',
      },
      {
        id: 'rec_c',
        stage: 1,
        title: 'Passe C (Quebrado !)',
        subtitle: 'Passe afastado / bola alta',
        sampleN: s1Counts.rec_c?.count ?? 0,
        rate: s1Counts.rec_c?.count ? (s1Counts.rec_c.kills / s1Counts.rec_c.count) * 100 : 0,
        rateLabel: 'Virada',
        status: 'negative',
      },
      {
        id: 'serve_plus',
        stage: 1,
        title: 'Saque + (Quebrou Passe)',
        subtitle: 'Forçou recepção fora da Z3',
        sampleN: s1Counts.serve_plus?.count ?? 0,
        rate: s1Counts.serve_plus?.count ? (s1Counts.serve_plus.kills / s1Counts.serve_plus.count) * 100 : 0,
        rateLabel: 'Break Point',
        status: 'positive',
      },
      {
        id: 'transition',
        stage: 1,
        title: 'Transição & Defesa',
        subtitle: 'Contra-ataque após defesa',
        sampleN: s1Counts.transition?.count ?? 0,
        rate: s1Counts.transition?.count ? (s1Counts.transition.kills / s1Counts.transition.count) * 100 : 0,
        rateLabel: 'Taxa de Ponto',
        status: 'neutral',
      },
    );
  }

  const s2Nodes: MarkovNode[] = [
    {
      id: 'p4',
      stage: 2,
      title: 'Ponta (P4)',
      subtitle: 'Entrada de rede / bola rápida',
      sampleN: s2Counts.p4.count,
      rate: s2Counts.p4.count ? (s2Counts.p4.kills / s2Counts.p4.count) * 100 : 0,
      rateLabel: 'Eficácia',
      status: 'neutral',
    },
    {
      id: 'p3',
      stage: 2,
      title: 'Central (P3)',
      subtitle: 'Meio de rede / 1º tempo',
      sampleN: s2Counts.p3.count,
      rate: s2Counts.p3.count ? (s2Counts.p3.kills / s2Counts.p3.count) * 100 : 0,
      rateLabel: 'Eficácia',
      status: 'neutral',
    },
    {
      id: 'p2',
      stage: 2,
      title: 'Saída / Oposto (P2)',
      subtitle: 'Saída de rede / oposto',
      sampleN: s2Counts.p2.count,
      rate: s2Counts.p2.count ? (s2Counts.p2.kills / s2Counts.p2.count) * 100 : 0,
      rateLabel: 'Eficácia',
      status: 'neutral',
    },
    {
      id: 'p6',
      stage: 2,
      title: 'Pipe / Fundo (P6)',
      subtitle: 'Ataque da linha dos 3 metros',
      sampleN: s2Counts.p6.count,
      rate: s2Counts.p6.count ? (s2Counts.p6.kills / s2Counts.p6.count) * 100 : 0,
      rateLabel: 'Eficácia',
      status: 'neutral',
    },
  ];

  const s3Nodes: MarkovNode[] = [
    {
      id: 'terminal_kill',
      stage: 3,
      title: `Ponto Direto (${teamName})`,
      subtitle: 'Ataque vencedor / Kill',
      sampleN: totalKills,
      rate: (totalKills / totalAnalyzed) * 100,
      rateLabel: '% Desfecho',
      status: 'positive',
    },
    {
      id: 'terminal_continuity',
      stage: 3,
      title: 'Continuidade de Jogo',
      subtitle: 'Bola defendida / rali em disputa',
      sampleN: totalContinuity,
      rate: (totalContinuity / totalAnalyzed) * 100,
      rateLabel: '% Desfecho',
      status: 'warning',
    },
    {
      id: 'terminal_error',
      stage: 3,
      title: `Bloqueado / Erro (${opponentName})`,
      subtitle: 'Ponto cedido ao adversário',
      sampleN: totalErrors,
      rate: (totalErrors / totalAnalyzed) * 100,
      rateLabel: '% Desfecho',
      status: 'negative',
    },
  ];

  const nodes = [...s1Nodes, ...s2Nodes, ...s3Nodes];

  const links: MarkovLink[] = [];
  link1to2.forEach((volume, key) => {
    const [fromId, toId] = key.split(':');
    const s1Total = s1Counts[fromId]?.count || volume;
    links.push({
      fromId,
      toId,
      volume,
      probability: s1Total > 0 ? volume / s1Total : 0,
      type: 'rally',
    });
  });

  link2to3.forEach((outcomes, s2Id) => {
    const s2Total = s2Counts[s2Id]?.count || (outcomes.kill + outcomes.rally + outcomes.error);
    if (outcomes.kill > 0) {
      links.push({ fromId: s2Id, toId: 'terminal_kill', volume: outcomes.kill, probability: s2Total > 0 ? outcomes.kill / s2Total : 0, type: 'kill' });
    }
    if (outcomes.rally > 0) {
      links.push({ fromId: s2Id, toId: 'terminal_continuity', volume: outcomes.rally, probability: s2Total > 0 ? outcomes.rally / s2Total : 0, type: 'rally' });
    }
    if (outcomes.error > 0) {
      links.push({ fromId: s2Id, toId: 'terminal_error', volume: outcomes.error, probability: s2Total > 0 ? outcomes.error / s2Total : 0, type: 'error' });
    }
  });

  directLink1to3.forEach((outcomes, s1Id) => {
    const s1Total = s1Counts[s1Id]?.count || (outcomes.kill + outcomes.rally + outcomes.error);
    if (outcomes.kill > 0) {
      links.push({ fromId: s1Id, toId: 'terminal_kill', volume: outcomes.kill, probability: s1Total > 0 ? outcomes.kill / s1Total : 0, type: 'kill' });
    }
    if (outcomes.error > 0) {
      links.push({ fromId: s1Id, toId: 'terminal_error', volume: outcomes.error, probability: s1Total > 0 ? outcomes.error / s1Total : 0, type: 'error' });
    }
  });

  return { nodes, links, ralliesByNode, phaseCounts };
}

function isTeamOnRightSideInRally(rally: RallyPathRally, teamId: string): boolean {
  for (const c of rally.contacts) {
    if (c.teamId === teamId && c.spatial) {
      if (c.skill === 'attack' && c.spatial.origin?.x !== undefined) {
        return c.spatial.origin.x > 0.5;
      }
      if (c.skill === 'serve' && c.spatial.origin?.x !== undefined) {
        return c.spatial.origin.x > 0.5;
      }
      if (c.skill === 'reception') {
        if (c.spatial.origin?.x !== undefined && c.spatial.origin.x > 0.5) return true;
        if (c.spatial.target?.x !== undefined && c.spatial.target.x > 0.5) return true;
      }
    }
  }
  return false;
}

function canonicalPoint(pt: { x: number; y: number }, shouldFlip: boolean): { x: number; y: number } {
  if (!shouldFlip) return pt;
  return {
    x: Number((1 - pt.x).toFixed(4)),
    y: Number((1 - pt.y).toFixed(4)),
  };
}

function extractCourtPointsFromRallies(
  rallies: readonly RallyPathRally[],
  teamId: string,
  selectedNodeId?: string,
  receptionViewMode: 'attacks' | 'passes' = 'attacks',
): {
  events: CourtEventPoint[];
  vectors: CourtVector[];
  directionalSummary: DirectionalSummaryItem[];
} {
  const events: CourtEventPoint[] = [];
  const vectors: CourtVector[] = [];
  const dirCounts: Record<
    string,
    { total: number; kills: number; errors: number; continuity: number; name: string }
  > = {};

  const isRecNode = selectedNodeId === 'rec_a' || selectedNodeId === 'rec_b' || selectedNodeId === 'rec_c';
  const isServeNode = selectedNodeId === 'serve_ace' || selectedNodeId === 'serve_plus' || selectedNodeId === 'serve_reg';
  const isAttackNode = selectedNodeId === 'p4' || selectedNodeId === 'p3' || selectedNodeId === 'p2' || selectedNodeId === 'p6' || selectedNodeId === 'terminal_kill' || selectedNodeId === 'terminal_error';

  const registerDirection = (zoneKey: string, dirName: string, outcome: 'kill' | 'error' | 'rally') => {
    if (!dirCounts[zoneKey]) {
      dirCounts[zoneKey] = { total: 0, kills: 0, errors: 0, continuity: 0, name: dirName };
    }
    dirCounts[zoneKey].total++;
    if (outcome === 'kill') dirCounts[zoneKey].kills++;
    else if (outcome === 'error') dirCounts[zoneKey].errors++;
    else dirCounts[zoneKey].continuity++;
  };

  rallies.forEach((r) => {
    const isKill = r.terminal?.winnerTeamId === teamId;
    const isError = r.terminal?.winnerTeamId && r.terminal.winnerTeamId !== teamId;
    const type: 'point' | 'error' | 'rally' = isKill ? 'point' : isError ? 'error' : 'rally';
    const outcome: 'kill' | 'error' | 'rally' = isKill ? 'kill' : isError ? 'error' : 'rally';
    const shouldFlip = isTeamOnRightSideInRally(r, teamId);

    // Quando o usuário seleciona um nó de recepção e o modo é 'attacks' (padrão):
    // Exibimos os ataques da equipe que nasceram dessa recepção com alvos na quadra adversária!
    if (isRecNode && receptionViewMode === 'attacks') {
      const ourAttack = r.contacts.find((c) => c.teamId === teamId && c.skill === 'attack');
      if (ourAttack?.spatial?.target) {
        const canTarget = canonicalPoint(ourAttack.spatial.target, shouldFlip);
        events.push({
          xNorm: canTarget.x,
          yNorm: canTarget.y,
          weight: isKill ? 1.8 : 1.0,
          type,
          label: `Set ${r.setNumber} · Ataque pós-Passe · ${type === 'point' ? 'Ponto Vencedor (Kill)' : type === 'error' ? 'Erro / Bloqueado' : 'Bola defendida'}`,
        });

        if (ourAttack.spatial.origin) {
          const canOrigin = canonicalPoint(ourAttack.spatial.origin, shouldFlip);
          vectors.push({
            from: [canOrigin.x, canOrigin.y],
            to: [canTarget.x, canTarget.y],
            outcome,
            label: `Ataque após ${selectedNodeId === 'rec_a' ? 'Passe A' : selectedNodeId === 'rec_b' ? 'Passe B' : 'Passe C'}`,
          });

          const tx = canTarget.x;
          const ty = canTarget.y;
          if (tx < 0.68) {
            registerDirection('short', 'Diagonal Curta / Largada', outcome);
          } else if (ty <= 0.35) {
            registerDirection('z1', 'Paralela / Z1', outcome);
          } else if (ty >= 0.65) {
            registerDirection('z5', 'Diagonal Longa / Z5', outcome);
          } else {
            registerDirection('z6', 'Fundo Meio / Z6', outcome);
          }
        }
      }
      return;
    }

    // Se é nó de recepção e modo é 'passes':
    if (isRecNode && receptionViewMode === 'passes') {
      const ourRec = r.contacts.find((c) => c.teamId === teamId && c.skill === 'reception');
      if (ourRec?.spatial?.target) {
        const canTarget = canonicalPoint(ourRec.spatial.target, shouldFlip);
        const passOutcome: 'kill' | 'rally' | 'error' =
          ourRec.quality === '#' || ourRec.quality === 'excellent'
            ? 'kill'
            : ourRec.quality === '+' || ourRec.quality === 'positive'
            ? 'rally'
            : 'error';
        const passType: 'point' | 'rally' | 'error' = passOutcome === 'kill' ? 'point' : passOutcome;

        events.push({
          xNorm: canTarget.x,
          yNorm: canTarget.y,
          weight: passOutcome === 'kill' ? 1.8 : 1.0,
          type: passType,
          label: `Set ${r.setNumber} · Recepção · ${ourRec.quality ?? 'Regular'}`,
        });

        if (ourRec.spatial.origin) {
          const canOrigin = canonicalPoint(ourRec.spatial.origin, shouldFlip);
          vectors.push({
            from: [canOrigin.x, canOrigin.y],
            to: [canTarget.x, canTarget.y],
            outcome: passOutcome,
            label: `Passe para Z${ourRec.spatial.targetRegionId ?? '3'}`,
          });

          const ty = canTarget.y;
          if (ourRec.spatial.targetRegionId === '3' || (canTarget.x >= 0.30 && canTarget.x <= 0.50 && ty >= 0.35 && ty <= 0.65)) {
            registerDirection('z3', 'Na mão do levantador (Z3)', passOutcome);
          } else if (ty < 0.35) {
            registerDirection('p4', 'Afastado para Ponta (P4)', passOutcome);
          } else if (ty > 0.65) {
            registerDirection('p2', 'Afastado para Saída (P2)', passOutcome);
          } else {
            registerDirection('back', 'Afastado no Fundo', passOutcome);
          }
        }
      }
      return;
    }

    // Demais casos (Ataque, Saque, Transição):
    r.contacts.forEach((c) => {
      if (isServeNode && c.skill !== 'serve') return;
      if (isAttackNode && c.skill !== 'attack') return;

      if (c.teamId === teamId && c.spatial?.target) {
        const canTarget = canonicalPoint(c.spatial.target, shouldFlip);
        events.push({
          xNorm: canTarget.x,
          yNorm: canTarget.y,
          weight: isKill ? 1.8 : 1.0,
          type,
          label: `Set ${r.setNumber} · ${c.skill} · ${type === 'point' ? 'Ponto Direto (Kill)' : type === 'error' ? 'Erro / Bloqueado' : 'Bola defendida'}`,
        });

        if (c.spatial.origin && c.spatial.target) {
          const canOrigin = canonicalPoint(c.spatial.origin, shouldFlip);
          vectors.push({
            from: [canOrigin.x, canOrigin.y],
            to: [canTarget.x, canTarget.y],
            outcome,
          });

          const tx = canTarget.x;
          const ty = canTarget.y;

          if (c.skill === 'attack') {
            if (selectedNodeId === 'p4') {
              if (tx < 0.68) registerDirection('short', 'Diagonal Curta / Largada', outcome);
              else if (ty >= 0.65) registerDirection('z5', 'Diagonal Longa (Z5)', outcome);
              else if (ty <= 0.35) registerDirection('z1', 'Paralela (Z1)', outcome);
              else registerDirection('z6', 'Fundo Meio (Z6)', outcome);
            } else if (selectedNodeId === 'p2') {
              if (tx < 0.68) registerDirection('short', 'Diagonal Curta / Largada', outcome);
              else if (ty <= 0.35) registerDirection('z1', 'Diagonal Longa (Z1)', outcome);
              else if (ty >= 0.65) registerDirection('z5', 'Paralela (Z5)', outcome);
              else registerDirection('z6', 'Fundo Meio (Z6)', outcome);
            } else if (selectedNodeId === 'p3') {
              if (ty < 0.35) registerDirection('z1', 'Meio para Z1', outcome);
              else if (ty > 0.65) registerDirection('z5', 'Meio para Z5', outcome);
              else registerDirection('z6', 'Fundo Meio (Z6)', outcome);
            } else {
              if (ty > 0.65) registerDirection('z5', 'Fundo Esquerda (Z5)', outcome);
              else if (ty < 0.35) registerDirection('z1', 'Fundo Direita (Z1)', outcome);
              else registerDirection('z6', 'Fundo Meio (Z6)', outcome);
            }
          } else if (c.skill === 'serve') {
            if (ty > 0.65) registerDirection('z5', 'Saque no Canto (Z5)', outcome);
            else if (ty < 0.35) registerDirection('z1', 'Saque no Canto (Z1)', outcome);
            else registerDirection('z6', 'Saque no Centro (Z6)', outcome);
          }
        }
      }
    });
  });

  const directionalSummary: DirectionalSummaryItem[] = Object.entries(dirCounts)
    .map(([zone, data]) => ({
      zone,
      name: data.name,
      total: data.total,
      kills: data.kills,
      errors: data.errors,
      continuity: data.continuity,
      killRate: data.total > 0 ? (data.kills / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { events, vectors, directionalSummary };
}

function computeTacticalBriefing(
  selectedNodeId: string | undefined,
  nodes: readonly MarkovNode[],
  rallies: readonly RallyPathRally[],
  teamId: string,
  teamName: string,
  phaseFilter: PhaseFilter,
) {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNodeId || !selectedNode) {
    const totalRallies = rallies.length;
    const wins = rallies.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const losses = rallies.filter((r) => r.terminal?.winnerTeamId && r.terminal.winnerTeamId !== teamId).length;
    const winRate = totalRallies > 0 ? ((wins / totalRallies) * 100).toFixed(1) : '0.0';

    return {
      title: phaseFilter === 'k1_sideout'
        ? 'Visão Geral · Virada de Bola (Sideout / K1)'
        : phaseFilter === 'k2_breakpoint'
        ? 'Visão Geral · Saque & Defesa (Break Point / K2)'
        : 'Fluxo Tático Completo da Partida',
      badge: 'Visão Geral',
      primaryMetricLabel: phaseFilter === 'k1_sideout' ? 'Taxa Geral de Virada' : phaseFilter === 'k2_breakpoint' ? 'Taxa de Break Point' : 'Aproveitamento Geral',
      primaryMetricValue: `${winRate}%`,
      sampleCount: totalRallies,
      killsCount: wins,
      errorsCount: losses,
      narrative: `Selecione qualquer card no fluxograma (ex: Passe A, Ponta P4 ou Ponto Direto) para isolar trajetórias, eficácia e tendências direcionais na quadra.`,
    };
  }

  if (selectedNodeId === 'rec_a' || selectedNodeId === 'rec_b' || selectedNodeId === 'rec_c') {
    const totalPasses = selectedNode.sampleN;
    const kills = rallies.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const losses = totalPasses - kills;
    const sideoutRate = selectedNode.rate.toFixed(1);

    const attacksP4 = rallies.filter((r) => r.contacts.some((c) => c.teamId === teamId && c.skill === 'attack' && (c.spatial?.originRegionId === '4' || !c.spatial?.originRegionId)));
    const attacksP2 = rallies.filter((r) => r.contacts.some((c) => c.teamId === teamId && c.skill === 'attack' && (c.spatial?.originRegionId === '2' || c.spatial?.originRegionId === '1')));
    const attacksP3 = rallies.filter((r) => r.contacts.some((c) => c.teamId === teamId && c.skill === 'attack' && c.spatial?.originRegionId === '3'));

    const p4Kills = attacksP4.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const p2Kills = attacksP2.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const p3Kills = attacksP3.filter((r) => r.terminal?.winnerTeamId === teamId).length;

    const p4Rate = attacksP4.length > 0 ? Math.round((p4Kills / attacksP4.length) * 100) : 0;
    const p2Rate = attacksP2.length > 0 ? Math.round((p2Kills / attacksP2.length) * 100) : 0;
    const p3Rate = attacksP3.length > 0 ? Math.round((p3Kills / attacksP3.length) * 100) : 0;

    const distParts: string[] = [];
    if (attacksP4.length > 0) distParts.push(`${attacksP4.length} na Ponta P4 (${p4Rate}% virada)`);
    if (attacksP2.length > 0) distParts.push(`${attacksP2.length} na Saída P2 (${p2Rate}% virada)`);
    if (attacksP3.length > 0) distParts.push(`${attacksP3.length} no Meio P3 (${p3Rate}% virada)`);

    const passName = selectedNodeId === 'rec_a' ? 'Passe A (Excelente #)' : selectedNodeId === 'rec_b' ? 'Passe B (Positivo +)' : 'Passe C (Quebrado !)';

    return {
      title: `${passName} · Efetivação de Virada`,
      badge: 'Análise de Recepção',
      primaryMetricLabel: 'Taxa de Virada de Bola (Sideout)',
      primaryMetricValue: `${sideoutRate}%`,
      sampleCount: totalPasses,
      killsCount: kills,
      errorsCount: losses,
      narrative: `Em ${totalPasses} recepções com ${passName}, o ${teamName} converteu ${sideoutRate}% em ponto direto (${kills} pontos ganhos e ${losses} cedidos). Distribuição do ataque: ${distParts.join(', ') || 'sem ataques registrados'}. Use a quadra à direita para ver onde os ataques caíram na quadra adversária.`,
    };
  }

  if (selectedNodeId === 'p4' || selectedNodeId === 'p3' || selectedNodeId === 'p2' || selectedNodeId === 'p6') {
    const totalAttacks = selectedNode.sampleN;
    const kills = rallies.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const losses = totalAttacks - kills;
    const killRate = selectedNode.rate.toFixed(1);

    return {
      title: `${selectedNode.title} · Eficácia de Finalização`,
      badge: 'Análise de Ataque',
      primaryMetricLabel: 'Eficácia de Ataque (Kill Rate)',
      primaryMetricValue: `${killRate}%`,
      sampleCount: totalAttacks,
      killsCount: kills,
      errorsCount: losses,
      narrative: `O ${teamName} atacou ${totalAttacks} bolas nesta posição com ${killRate}% de aproveitamento (${kills} pontos vencedores e ${losses} bolas defendidas ou erros). As setas na quadra mostram as rotas até o chão da quadra adversária.`,
    };
  }

  if (selectedNodeId === 'serve_ace' || selectedNodeId === 'serve_plus' || selectedNodeId === 'serve_reg') {
    const totalServes = selectedNode.sampleN;
    const bpWins = rallies.filter((r) => r.terminal?.winnerTeamId === teamId).length;
    const bpLosses = totalServes - bpWins;
    const bpRate = selectedNode.rate.toFixed(1);

    return {
      title: `${selectedNode.title} · Pressão de Saque`,
      badge: 'Análise de Saque',
      primaryMetricLabel: 'Conversão em Break Point',
      primaryMetricValue: `${bpRate}%`,
      sampleCount: totalServes,
      killsCount: bpWins,
      errorsCount: bpLosses,
      narrative: `Em ${totalServes} saques com esta característica, o ${teamName} pontuou em ${bpRate}% dos ralis (${bpWins} break points ganhos).`,
    };
  }

  return {
    title: `${selectedNode.title}`,
    badge: 'Desfecho do Rali',
    primaryMetricLabel: '% do Total de Ralis',
    primaryMetricValue: `${selectedNode.rate.toFixed(1)}%`,
    sampleCount: selectedNode.sampleN,
    killsCount: selectedNodeId === 'terminal_kill' ? selectedNode.sampleN : 0,
    errorsCount: selectedNodeId === 'terminal_error' ? selectedNode.sampleN : 0,
    narrative: `Registrado em ${selectedNode.sampleN} ralis analisados. A quadra exibe as trajetórias correspondentes a este desfecho.`,
  };
}

export function SequenceAnalyticsPanel({
  analytics,
  teams,
  teamId,
  players = [],
  winProbability,
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
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [showWinProb, setShowWinProb] = useState(true);
  const [horizon, setHorizon] = useState<1 | 2>(1);
  const [spatialRole, setSpatialRole] = useState<SpatialRole>('origin');
  const [spatialRegionId, setSpatialRegionId] = useState('');
  const [courtMode, setCourtMode] = useState<CourtMode>('actions');
  const [showAllTrajectories, setShowAllTrajectories] = useState(false);
  const [viewMode, setViewMode] = useState<'markov_tree' | 'macrocomplex' | 'flow'>('markov_tree');
  const [selectedMarkovNodeId, setSelectedMarkovNodeId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [mobileNodeId, setMobileNodeId] = useState<string>();
  const [evidenceIds, setEvidenceIds] = useState<readonly string[]>([]);
  const [previousFocus, setPreviousFocus] = useState<FocusSnapshot>();
  const [focusMessage, setFocusMessage] = useState('');
  const [focusFundamento, setFocusFundamento] = useState<'all' | 'reception' | 'attack' | 'serve'>('all');
  const [receptionViewMode, setReceptionViewMode] = useState<'attacks' | 'passes'>('attacks');

  const markovTreeData = useMemo(
    () => buildVolleyballMarkovTree(rallies, activeTeamId, teams, setFilter, phaseFilter),
    [activeTeamId, phaseFilter, rallies, setFilter, teams],
  );
  const selectedMarkovNode = markovTreeData.nodes.find((n) => n.id === selectedMarkovNodeId);
  const markovNodeRallies = selectedMarkovNodeId
    ? (markovTreeData.ralliesByNode.get(selectedMarkovNodeId) ?? rallies)
    : rallies;
  const proCourtData = useMemo(
    () => extractCourtPointsFromRallies(markovNodeRallies, activeTeamId, selectedMarkovNodeId, receptionViewMode),
    [activeTeamId, markovNodeRallies, receptionViewMode, selectedMarkovNodeId],
  );
  const coachBriefing = useMemo(
    () =>
      computeTacticalBriefing(
        selectedMarkovNodeId,
        markovTreeData.nodes,
        markovNodeRallies,
        activeTeamId,
        teamName(teams, activeTeamId),
        phaseFilter,
      ),
    [activeTeamId, markovNodeRallies, markovTreeData.nodes, phaseFilter, selectedMarkovNodeId, teams],
  );
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
  const spatialComparison = useMemo(() => compareRallyPathRegions(model, focusFilters), [model, focusFilters]);
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
          <p className="eyebrow">Transições entre ações</p>
          <h3 id="rally-explorer-title">Próximas ações observadas</h3>
        </div>
        <div className="rally-view-mode-toggle" role="group" aria-label="Modo de análise tática">
          <button
            type="button"
            className={viewMode === 'markov_tree' ? 'active' : ''}
            onClick={() => setViewMode('markov_tree')}
          >
            🏐 Fluxo Tático & Quadra
          </button>
          <button
            type="button"
            className={viewMode === 'macrocomplex' ? 'active' : ''}
            onClick={() => setViewMode('macrocomplex')}
          >
            ⚡ Fases de Jogo (K1 / K2)
          </button>
          <button
            type="button"
            className={viewMode === 'flow' ? 'active' : ''}
            onClick={() => setViewMode('flow')}
          >
            🔬 Cadeia de Transições
          </button>
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

      {winProbability && (
        <section className="sequence-win-prob-wrapper" aria-label="Curva de probabilidade de vitória e momentum">
          <button
            type="button"
            className="sequence-win-prob-toggle"
            onClick={() => setShowWinProb((prev) => !prev)}
            aria-expanded={showWinProb}
          >
            <span className="toggle-label">
              ⚡ <strong>Momentum & Probabilidade de Vitória</strong>
              <small> — {teams[0]?.name ?? 'Equipe A'} {Math.round((winProbability.teamA ?? 0.5) * 100)}% × {Math.round((winProbability.teamB ?? 0.5) * 100)}% {teams[1]?.name ?? 'Equipe B'}</small>
            </span>
            <span className="toggle-icon">{showWinProb ? '▲ Ocultar Gráfico' : '▼ Visualizar Gráfico'}</span>
          </button>
          {showWinProb && (
            <div className="sequence-win-prob-body">
              <WinProbabilityChart
                winProbability={winProbability}
                teams={teams}
                currentSet={setFilter === 'all' ? 'all' : Number(setFilter)}
              />
            </div>
          )}
        </section>
      )}

      {viewMode === 'markov_tree' && (
        <div className="markov-pro-container">
          <div className="markov-workbench-controls">
            <div className="markov-phase-selector" role="group" aria-label="Fase do rali">
              <span className="phase-label">Fase Tática:</span>
              <button
                type="button"
                className={phaseFilter === 'all' ? 'active' : ''}
                onClick={() => setPhaseFilter('all')}
              >
                🔄 Todos os Ralis ({markovTreeData.phaseCounts.all})
              </button>
              <button
                type="button"
                className={phaseFilter === 'k1_sideout' ? 'active' : ''}
                onClick={() => setPhaseFilter('k1_sideout')}
              >
                🛡️ Virada de Bola (Sideout / K1) ({markovTreeData.phaseCounts.k1})
              </button>
              <button
                type="button"
                className={phaseFilter === 'k2_breakpoint' ? 'active' : ''}
                onClick={() => setPhaseFilter('k2_breakpoint')}
              >
                🎯 Saque & Defesa (Break Point / K2) ({markovTreeData.phaseCounts.k2})
              </button>
            </div>

            <div className="markov-skill-selector" role="group" aria-label="Filtro por fundamento">
              <span className="skill-filter-label">Foco:</span>
              <button
                type="button"
                className={focusFundamento === 'all' && !selectedMarkovNodeId ? 'active' : ''}
                onClick={() => {
                  setFocusFundamento('all');
                  setSelectedMarkovNodeId(undefined);
                }}
              >
                🏐 Todos
              </button>
              <button
                type="button"
                className={focusFundamento === 'reception' || (selectedMarkovNodeId?.startsWith('rec_') ?? false) ? 'active' : ''}
                onClick={() => {
                  setFocusFundamento('reception');
                  setPhaseFilter('k1_sideout');
                  setSelectedMarkovNodeId('rec_a');
                }}
              >
                🛡️ Recepção / Passe
              </button>
              <button
                type="button"
                className={focusFundamento === 'attack' || selectedMarkovNodeId === 'p4' || selectedMarkovNodeId === 'p3' || selectedMarkovNodeId === 'p2' || selectedMarkovNodeId === 'p6' ? 'active' : ''}
                onClick={() => {
                  setFocusFundamento('attack');
                  setSelectedMarkovNodeId('p4');
                }}
              >
                ⚔️ Ataque
              </button>
              <button
                type="button"
                className={focusFundamento === 'serve' || (selectedMarkovNodeId?.startsWith('serve_') ?? false) ? 'active' : ''}
                onClick={() => {
                  setFocusFundamento('serve');
                  setPhaseFilter('k2_breakpoint');
                  setSelectedMarkovNodeId('serve_plus');
                }}
              >
                🚀 Saque
              </button>
            </div>
          </div>

          {/* Diagnóstico Tático Direto para a Comissão Técnica */}
          <div className="coach-tactical-briefing" aria-label="Diagnóstico tático do treinador">
            <div className="briefing-header">
              <span className="briefing-badge">💡 {coachBriefing.badge}</span>
              <strong className="briefing-title">{coachBriefing.title}</strong>
            </div>
            <div className="briefing-stats">
              <div className="stat-pill highlight">
                <span className="label">{coachBriefing.primaryMetricLabel}:</span>
                <strong className="value">{coachBriefing.primaryMetricValue}</strong>
              </div>
              <div className="stat-pill">
                <span className="label">Amostra:</span>
                <strong className="value">{coachBriefing.sampleCount} bolas</strong>
              </div>
              <div className="stat-pill">
                <span className="label">Pontos Vencidos:</span>
                <strong className="value text-mint">{coachBriefing.killsCount}</strong>
              </div>
              <div className="stat-pill">
                <span className="label">Pontos Perdidos:</span>
                <strong className="value text-coral">{coachBriefing.errorsCount}</strong>
              </div>
            </div>
            <p className="briefing-narrative">
              {coachBriefing.narrative}
            </p>
          </div>

          <div className="markov-pro-workbench">
            <div className="markov-pro-tree-area">
              <MarkovTree
                nodes={markovTreeData.nodes}
                links={markovTreeData.links}
                onSelectNode={(node) => setSelectedMarkovNodeId(node.id === selectedMarkovNodeId ? undefined : node.id)}
                selectedNodeId={selectedMarkovNodeId}
              />
            </div>
            <div className="markov-pro-court-area">
              <VolleyballCourtPro
                events={proCourtData.events}
                vectors={proCourtData.vectors}
                selectedVector={proCourtData.vectors[0]}
                leftTeamLabel={teamName(teams, activeTeamId)}
                rightTeamLabel={teams.find((t) => t.id !== activeTeamId)?.name ?? 'Adversário'}
                leftRoleLabel={
                  selectedMarkovNodeId?.startsWith('rec_')
                    ? (receptionViewMode === 'attacks' ? 'Ataque pós-Passe' : 'Recepção / Fundo')
                    : selectedMarkovNodeId?.startsWith('serve_')
                      ? 'Saque / Fundo'
                      : 'Ataque (Golpe)'
                }
                rightRoleLabel={
                  selectedMarkovNodeId?.startsWith('rec_')
                    ? (receptionViewMode === 'attacks' ? 'Defesa / Alvo' : 'Levantador / Z3')
                    : selectedMarkovNodeId?.startsWith('serve_')
                      ? 'Recepção Adversária'
                      : 'Defesa / Alvo'
                }
                subViewToggle={
                  selectedMarkovNodeId?.startsWith('rec_')
                    ? {
                        label: 'Modo de visualização do passe',
                        options: [
                          { id: 'attacks', label: '⚔️ Ataques Gerados (Virada)' },
                          { id: 'passes', label: '🛡️ Trajetórias do Passe (Z3)' },
                        ],
                        activeId: receptionViewMode,
                        onSelect: (id) => setReceptionViewMode(id as 'attacks' | 'passes'),
                      }
                    : undefined
                }
                directionalSummary={proCourtData.directionalSummary}
                title={`Quadra Tática Pro · ${selectedMarkovNode ? selectedMarkovNode.title : (phaseFilter === 'k1_sideout' ? 'Virada de Bola (K1)' : phaseFilter === 'k2_breakpoint' ? 'Saque & Defesa (K2)' : 'Todos os Desfechos')}`}
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'macrocomplex' && (
        <MacrocomplexGraph
          pathRallies={rallies}
          teamId={activeTeamId}
          teams={teams}
          setFilter={setFilter}
        />
      )}

      <p className="rally-model-note">Saque–recepção e ataque–defesa contam como uma etapa conjunta. A próxima transição mostra o que aconteceu depois da troca, sem duplicar a relação entre as notas.</p>
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
              1 etapa
            </button>
            <button type="button" aria-pressed={horizon === 2} onClick={() => setHorizon(2)}>
              2 etapas
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
              A quadra seleciona a ação inicial. As zonas dos contatos seguintes também compõem os estados da cadeia; posições ausentes ficam identificadas como desconhecidas.
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
        <section className="rally-spatial-comparison" aria-label="Eficácia por zona">
          <h5>Eficácia por zona de {spatialRole === 'origin' ? 'origem' : 'destino'}</h5>
          <p>Mesma equipe, fundamento, qualidade, atleta e rotação; varia somente a zona. Positivos = # e + entre contatos com #, +, − ou =. Vitória usa rallies distintos e o potencial usa a cadeia espacial. São associações observadas, não efeitos causais.</p>
          <div className="rally-technical-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>Zona</th><th>Ações / rallies</th><th>Positivos #/+</th><th>Rallies vencidos</th><th>Potencial</th></tr></thead>
              <tbody>{spatialComparison.map(item => <tr key={item.regionId}>
                <th><button type="button" aria-pressed={spatialRegionId === item.regionId} onClick={() => setSpatialRegionId(spatialRegionId === item.regionId ? '' : item.regionId)}>Zona {item.regionId}</button></th>
                <td>{item.occurrences} / {item.rallies}{!item.availableForHeadline && <small> · Poucos registros</small>}</td>
                <td>{percent(item.positiveRate)} ({item.positiveCount}/{item.gradedCount})</td>
                <td>{percent(item.observedPointRate)}</td><td>{percent(item.potential)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {spatialComparison.length === 0 && <p>Sem zonas registradas para este recorte.</p>}
        </section>
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
