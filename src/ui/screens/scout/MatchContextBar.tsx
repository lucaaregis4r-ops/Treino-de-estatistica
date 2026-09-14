import type { KeyboardEvent } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { ScoutCoverageMode } from '../../../domain/scout/events/ScoutEvent';
import type { MatchContextAdjustmentInput } from '../../../application/ScoutTrainerService';
import { QuickMatchAdjustment } from './QuickMatchAdjustment';

const ROTATION_BY_SETTER_POSITION = Object.freeze({ 1: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 6 });

function closeDisclosure(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== 'Escape') return;
  const details = (event.target as HTMLElement).closest('details');
  if (!details?.open) return;
  event.preventDefault();
  event.stopPropagation();
  details.open = false;
  details.querySelector('summary')?.focus();
}

interface MatchContextBarProps {
  readonly workspace: MatchWorkspace;
  readonly activeTeamId: string;
  readonly observedTeamId?: string;
  readonly busy: boolean;
  readonly teamCodes?: { readonly home: string; readonly away: string };
  readonly onActiveTeamChange: (teamId: string) => void;
  readonly onScoreAdjust: (teamId: string, delta: number) => Promise<void>;
  readonly onAdjustContext?: (input: MatchContextAdjustmentInput) => Promise<void>;
  readonly onRecoverySkillChange: (skill?: Skill) => void;
  readonly coverageMode: ScoutCoverageMode;
  readonly onCoverageModeChange: (mode: ScoutCoverageMode) => void;
}

export function MatchContextBar({
  workspace,
  activeTeamId,
  observedTeamId,
  busy,
  teamCodes,
  onActiveTeamChange,
  onScoreAdjust,
  onAdjustContext,
  onRecoverySkillChange,
  coverageMode,
  onCoverageModeChange,
}: MatchContextBarProps) {
  const [teamA, teamB] = workspace.teams;
  const setCompleted = workspace.state.sets.find(
    (set) => set.setNumber === workspace.state.currentSet,
  )?.completed;
  const servingTeam = workspace.teams.find((team) => team.id === workspace.state.servingTeamId);
  const servingLineup = workspace.currentLineups.find(
    (lineup) => lineup.teamId === workspace.state.servingTeamId,
  );
  const serverSlot = servingLineup?.slots[servingLineup.positions[1]];
  const server = workspace.players.find((player) => player.id === serverSlot?.playerId);
  const contextTeamId = observedTeamId ?? activeTeamId;
  const activeTacticalState = workspace.state.tacticalStateByTeamId[contextTeamId];
  const activeSetter = workspace.players.find(
    (player) => player.id === activeTacticalState?.activeSetterPlayerId,
  );
  const rotation = activeTacticalState?.activeSetterPosition
    ? ROTATION_BY_SETTER_POSITION[activeTacticalState.activeSetterPosition]
    : undefined;
  const activeTeam = workspace.teams.find((team) => team.id === contextTeamId);
  const leftTeam = workspace.teams.find(
    (team) => team.id === workspace.state.courtOrientation.leftTeamId,
  );
  const rightTeam = workspace.teams.find(
    (team) => team.id === workspace.state.courtOrientation.rightTeamId,
  );

  return (
    <div className="match-context-bar" aria-label="Contexto atual da partida">
      <div className="match-context-primary-row">
        <span className="context-observed-team">
          Equipe observada: <strong>{activeTeam?.name ?? 'não definida'}</strong>
        </span>
        <label className="coverage-selector">
          Cobertura
          <select
            aria-label="Cobertura do scout"
            value={coverageMode}
            onChange={(event) => onCoverageModeChange(event.target.value as ScoutCoverageMode)}
          >
            <option value="both">Ambas as equipes</option>
            <option value="team_a">Somente {teamA.name}</option>
            <option value="team_b">Somente {teamB.name}</option>
          </select>
        </label>
        <span className="context-primary serving-inline">
          Saque: <strong>{servingTeam?.name ?? 'não definido'}</strong>
          {server ? ` · #${String(server.number).padStart(2, '0')} ${server.name ?? ''}` : ''}
        </span>
        <span>
          Rotação: <strong>{rotation ? `R${rotation}` : 'indefinida'}</strong>
        </span>
        <span className="set-flow-status">
          {workspace.state.matchCompleted
            ? 'Partida encerrada'
            : setCompleted
              ? 'Configure o próximo set abaixo'
              : 'Set em andamento'}
        </span>
      </div>

      <div className="match-context-secondary-row">
        {onAdjustContext && <QuickMatchAdjustment workspace={workspace} busy={busy} onApply={onAdjustContext} />}
        <details className="match-context-details" data-native-keys onKeyDown={closeDisclosure}>
          <summary>Detalhes da partida</summary>
          <div className="match-context-details-content">
            <span>Set: <strong>{workspace.state.currentSet}</strong></span>
            <span className="court-orientation">
              Quadra: <strong>{leftTeam?.name ?? '—'} esquerda</strong> ·{' '}
              <strong>{rightTeam?.name ?? '—'} direita</strong>
            </span>
            <span>
              Levantador:{' '}
              <strong>
                {activeSetter ? `#${String(activeSetter.number).padStart(2, '0')}` : 'indefinido'}
                {activeTacticalState?.activeSetterPosition
                  ? ` · P${activeTacticalState.activeSetterPosition}`
                  : ''}
              </strong>
            </span>
            <span>Rally <strong>{workspace.state.currentRally.status === 'active' ? 'ativo' : 'próximo'}</strong></span>
            <span>
              Perfil: <strong>{workspace.profiles.complexityProfile.name}</strong>
            </span>
            {teamCodes ? (
              <span className="team-code-key">
                <code>{teamCodes.home}</code> {teamA.name} · <code>{teamCodes.away}</code>{' '}
                {teamB.name}
              </span>
            ) : (
              <div className="team-toggle" aria-label="Equipe do próximo evento">
                {[teamA, teamB].map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={activeTeamId === team.id}
                    onClick={() => onActiveTeamChange(team.id)}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            )}
            <details className="score-adjustment">
              <summary>Ajustar placar</summary>
              <div>
                {[teamA, teamB].map((team, index) => {
                  const score = index === 0 ? workspace.state.score.teamA : workspace.state.score.teamB;
                  return (
                    <div key={team.id} className="score-adjustment-team">
                      <strong>{team.name}</strong>
                      <button
                        type="button"
                        aria-label={`Diminuir placar de ${team.name}`}
                        onClick={() => void onScoreAdjust(team.id, -1)}
                        disabled={busy || score === 0}
                      >
                        −
                      </button>
                      <span>{score}</span>
                      <button
                        type="button"
                        aria-label={`Aumentar placar de ${team.name}`}
                        onClick={() => void onScoreAdjust(team.id, 1)}
                        disabled={busy}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </details>

        <details className="recovery-tools" data-native-keys onKeyDown={closeDisclosure}>
          <summary>Partida precisa de correção</summary>
          <div className="recovery-content">
          <p>Use estas ferramentas somente para recuperar uma sequência inconsistente.</p>
          <div className="recovery-next-action" role="group" aria-label="Próxima ação">
            <span>Próxima ação:</span>
            {([
              ['serve', 'Saque'],
              ['reception', 'Recepção'],
              ['attack', 'Ataque'],
              ['dig', 'Defesa'],
              ['free_ball', 'Bola de graça'],
            ] as const).map(([skill, label]) => (
              <button key={skill} type="button" onClick={() => onRecoverySkillChange(skill)}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => onRecoverySkillChange(undefined)}>
              Usar sequência normal
            </button>
          </div>
          </div>
        </details>
      </div>
    </div>
  );
}
