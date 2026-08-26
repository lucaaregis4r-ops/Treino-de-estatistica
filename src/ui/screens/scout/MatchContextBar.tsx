import type { MatchWorkspace } from '../../../application/ScoutTrainerService';

const ROTATION_BY_SETTER_POSITION = Object.freeze({ 1: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 6 });

interface MatchContextBarProps {
  readonly workspace: MatchWorkspace;
  readonly activeTeamId: string;
  readonly teamCodes?: { readonly home: string; readonly away: string };
  readonly onActiveTeamChange: (teamId: string) => void;
}

export function MatchContextBar({
  workspace,
  activeTeamId,
  teamCodes,
  onActiveTeamChange,
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
  const activeTacticalState = workspace.state.tacticalStateByTeamId[activeTeamId];
  const activeSetter = workspace.players.find(
    (player) => player.id === activeTacticalState?.activeSetterPlayerId,
  );
  const rotation = activeTacticalState?.activeSetterPosition
    ? ROTATION_BY_SETTER_POSITION[activeTacticalState.activeSetterPosition]
    : undefined;

  return (
    <div className="match-context-bar" aria-label="Contexto atual da partida">
      <span className="context-primary serving-inline">
        Saque: <strong>{servingTeam?.name ?? 'não definido'}</strong>
        {server ? ` · #${String(server.number).padStart(2, '0')} ${server.name ?? ''}` : ''}
      </span>
      <span>
        Rotação: <strong>{rotation ? `R${rotation}` : 'indefinida'}</strong>
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
      <span>Rally {workspace.state.currentRally.status === 'active' ? 'ativo' : 'próximo'}</span>
      {teamCodes ? (
        <span className="team-code-key">
          <code>{teamCodes.home}</code> {teamA.name} · <code>a</code> {teamB.name}
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
      <span className="set-flow-status">
        {workspace.state.matchCompleted
          ? 'Partida encerrada'
          : setCompleted
            ? 'Configure o próximo set abaixo'
            : 'Set em andamento'}
      </span>
    </div>
  );
}
