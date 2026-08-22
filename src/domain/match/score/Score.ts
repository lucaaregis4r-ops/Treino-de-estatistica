export interface Score {
  readonly teamA: number;
  readonly teamB: number;
}

export type ScoreSnapshot = Readonly<Score>;

export function isScore(value: Score): boolean {
  return (
    Number.isSafeInteger(value.teamA) &&
    value.teamA >= 0 &&
    Number.isSafeInteger(value.teamB) &&
    value.teamB >= 0
  );
}
