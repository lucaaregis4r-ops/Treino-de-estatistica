interface GestureScoreCardProps {
  readonly homeName: string;
  readonly awayName: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly setNumber: number;
}

export function GestureScoreCard({
  homeName,
  awayName,
  homeScore,
  awayScore,
  setNumber,
}: GestureScoreCardProps) {
  return (
    <section className="gesture-score-card" aria-label="Placar compacto">
      <span title={homeName}>{homeName}</span>
      <strong>{homeScore} × {awayScore}</strong>
      <span title={awayName}>{awayName}</span>
      <small>SET {setNumber}</small>
    </section>
  );
}
