import { describe, expect, it } from 'vitest';
import { SetScoresCsvExporter } from './SetScoresCsv';

describe('SetScoresCsvExporter', () => {
  it('exports all five set scores in order', () => {
    const teams = [
      { id: 'a', name: 'Equipe A' },
      { id: 'b', name: 'Equipe B' },
    ] as const;
    const csv = new SetScoresCsvExporter().export(
      [
        { setNumber: 1, score: { teamA: 25, teamB: 20 }, completed: true, winnerTeamId: 'a' },
        { setNumber: 2, score: { teamA: 22, teamB: 25 }, completed: true, winnerTeamId: 'b' },
        { setNumber: 3, score: { teamA: 25, teamB: 18 }, completed: true, winnerTeamId: 'a' },
        { setNumber: 4, score: { teamA: 21, teamB: 25 }, completed: true, winnerTeamId: 'b' },
        { setNumber: 5, score: { teamA: 15, teamB: 13 }, completed: true, winnerTeamId: 'a' },
      ],
      teams,
    );

    expect(csv.split('\r\n')).toHaveLength(6);
    expect(csv).toContain('5,Equipe A,15,Equipe B,13,Equipe A,true');
  });
});
