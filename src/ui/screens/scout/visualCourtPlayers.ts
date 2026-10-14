import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';

export function visualCourtPlayers(workspace: MatchWorkspace, teamId: string, liberoId?: string) {
  const lineup = workspace.currentLineups?.find((l) => l.teamId === teamId);
  const positions: readonly CourtRotationPosition[] = [4, 3, 2, 5, 6, 1];
  const frontRowPositions: readonly CourtRotationPosition[] = [4, 3, 2];
  const backRowPositions: readonly CourtRotationPosition[] = [5, 6, 1];

  const effectiveLiberoId =
    liberoId ??
    workspace.state.metadata?.liberoPlayerIds?.find((id) =>
      workspace.players.some((p) => p.id === id && p.teamId === teamId),
    ) ??
    workspace.players.find(
      (p) => p.teamId === teamId && p.registeredRole === 'libero' && p.active !== false,
    )?.id;

  const libero = workspace.players.find(
    (p) => p.id === effectiveLiberoId && p.teamId === teamId && p.active !== false,
  );

  let cells = positions.map((position) => {
    const slot = lineup?.slots[lineup.positions[position]];
    let player = workspace.players.find((p) => p.id === slot?.playerId && p.active !== false);

    // REGRA DO VÔLEI: O líbero NUNCA pode ocupar a rede (P4, P3, P2).
    // Se o slot da rede estiver com o líbero, restauramos o atleta original (ou central).
    if (
      frontRowPositions.includes(position) &&
      player &&
      (player.id === libero?.id || player.registeredRole === 'libero')
    ) {
      const originalPlayer =
        workspace.players.find(
          (p) => p.id === slot?.originalPlayerId && p.active !== false,
        ) ??
        workspace.players.find(
          (p) =>
            p.teamId === teamId &&
            (p.registeredRole === 'middle' || slot?.tacticalRole?.startsWith('middle')) &&
            p.active !== false &&
            p.id !== libero?.id,
        );
      if (originalPlayer) {
        player = originalPlayer;
      }
    }

    return { position, slot, player };
  });

  if (!libero) return cells;

  const liberoInBackRow = cells.some(
    (c) => c.player?.id === libero.id && backRowPositions.includes(c.position),
  );
  if (liberoInBackRow) {
    return cells;
  }

  const isServing = workspace.state.servingTeamId === teamId;
  const centralInBackRow = cells.find((c) => {
    const role = c.slot?.activeRole ?? c.slot?.tacticalRole ?? c.player?.registeredRole;
    const isMiddle = role === 'middle' || role === 'middle_1' || role === 'middle_2';
    if (!c.player || !isMiddle || !backRowPositions.includes(c.position)) return false;
    if (c.position === 1 && isServing) return false;
    return true;
  });

  if (centralInBackRow) {
    cells = cells.map((c) => (c === centralInBackRow ? { ...c, player: libero } : c));
  }

  return cells;
}
