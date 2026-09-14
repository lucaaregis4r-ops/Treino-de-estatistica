import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { GesturePlayerSuggestionResolver } from '../../../domain/rally/gesture/GesturePlayerSuggestion';

const playerSuggestionResolver = new GesturePlayerSuggestionResolver();

export function visualSuggestion(workspace: MatchWorkspace): {
  teamId: string;
  skill?: Skill;
  playerNumber?: number;
} {
  const next = workspace.tacticalRally?.expectedNextAction;
  const preliminaryTeamId = next?.teamId ?? workspace.state.servingTeamId ?? workspace.teams[0].id;
  const skill = next?.skill === 'set' ? 'attack' : next?.skill;
  const teamId = skill === 'serve'
    ? workspace.state.servingTeamId ?? preliminaryTeamId
    : preliminaryTeamId;
  const lineup = workspace.currentLineups?.find((candidate) => candidate.teamId === teamId);
  const suggestion = skill ? playerSuggestionResolver.resolve(lineup, skill) : undefined;
  const player = workspace.players.find(
    (candidate) => candidate.id === suggestion?.automatic && candidate.active !== false,
  );
  return { teamId, skill, ...(player ? { playerNumber: player.number } : {}) };
}
