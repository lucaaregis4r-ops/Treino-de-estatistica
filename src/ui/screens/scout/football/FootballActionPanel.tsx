import type { FootballAction } from '../../../../domain/football/StatsBombContract';
import type { FootballOutcome } from '../../../../domain/football/FootballRecorder';

const ACTIONS: readonly [FootballAction, string][] = [
  ['pass', 'Passe'], ['carry', 'Condução'], ['dribble', 'Drible'], ['duel', 'Desarme'],
  ['interception', 'Interceptação'], ['ball_recovery', 'Recuperação'], ['loss', 'Perda'], ['shot', 'Finalização'],
  ['foul', 'Falta'], ['substitution', 'Substituição'],
];

const RESULTS: Record<FootballAction, readonly [FootballOutcome, string][]> = {
  pass: [['complete', 'Completo'], ['incomplete', 'Incompleto']], carry: [['observed', 'Observada']],
  dribble: [['won', 'Completo'], ['lost', 'Incompleto']], duel: [['won', 'Ganho'], ['lost', 'Perdido']],
  interception: [['observed', 'Observada']], ball_recovery: [['observed', 'Observada']], loss: [['observed', 'Observada']],
  shot: [['goal', 'Gol'], ['saved', 'Defendida'], ['blocked', 'Bloqueada'], ['off_target', 'Para fora'], ['post', 'Trave']],
  foul: [['observed', 'Observada']], substitution: [['observed', 'Observada']],
};

export function FootballActionPanel({ action, outcome, onAction, onOutcome }: {
  readonly action?: FootballAction; readonly outcome?: FootballOutcome;
  readonly onAction: (action: FootballAction) => void; readonly onOutcome: (outcome: FootballOutcome) => void;
}) {
  return <aside className="football-action-panel" aria-label="Ações do futebol">
    <strong>Ação</strong>
    <div className="football-action-buttons">{ACTIONS.map(([value, label]) => <button type="button" key={value} aria-pressed={action === value} onClick={() => onAction(value)}>{label}</button>)}</div>
    {action && <fieldset className="football-result-options"><legend>Resultado</legend><div>{RESULTS[action].map(([value, label]) => <button type="button" key={value} aria-pressed={outcome === value} onClick={() => onOutcome(value)}>{label}</button>)}</div></fieldset>}
  </aside>;
}
