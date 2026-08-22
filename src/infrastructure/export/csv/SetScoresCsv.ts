import type { Team } from '../../../domain/match/entities/Team';
import type { SetState } from '../../../domain/match/state/SetState';

function escapeCsv(value: string | number | boolean): string {
  const serialized = String(value);
  return /[",\r\n]/.test(serialized) ? `"${serialized.replaceAll('"', '""')}"` : serialized;
}

export class SetScoresCsvExporter {
  export(sets: readonly SetState[], teams: readonly [Team, Team]): string {
    const rows = [...sets]
      .sort((left, right) => left.setNumber - right.setNumber)
      .map((set) =>
        [
          set.setNumber,
          teams[0].name,
          set.score.teamA,
          teams[1].name,
          set.score.teamB,
          set.winnerTeamId === teams[0].id
            ? teams[0].name
            : set.winnerTeamId === teams[1].id
              ? teams[1].name
              : '',
          set.completed,
        ]
          .map(escapeCsv)
          .join(','),
      );
    return ['set,team_a,points_a,team_b,points_b,winner,completed', ...rows].join('\r\n');
  }
}
