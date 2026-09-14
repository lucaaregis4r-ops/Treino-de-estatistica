import type { Skill } from '../../../../domain/scout/entities/Skill';
import { evaluationLabel } from '../presentationLabels';

export function AttackOutcomeBar({
  skill = 'attack',
  outcome,
  onOutcome,
}: {
  readonly skill?: Skill;
  readonly outcome?: '#' | '=';
  readonly onOutcome?: (outcome?: '#' | '=') => void;
}) {
  return (
    <div className="gesture-outcome" aria-label="Resultado da ação">
      <button
        type="button"
        aria-label={`Qualidade # · ${evaluationLabel(skill, '#')}`}
        aria-pressed={outcome === '#'}
        onClick={() => onOutcome?.(outcome === '#' ? undefined : '#')}
      >
        <strong>#</strong><span>{evaluationLabel(skill, '#')}</span>
      </button>
      <button
        type="button"
        aria-label={`Qualidade = · ${evaluationLabel(skill, '=')}`}
        aria-pressed={outcome === '='}
        onClick={() => onOutcome?.(outcome === '=' ? undefined : '=')}
      >
        <strong>=</strong><span>{evaluationLabel(skill, '=')}</span>
      </button>
    </div>
  );
}
