import type { Skill } from '../../../../domain/scout/entities/Skill';
import type { ContactQuality } from '../../../../domain/scout/entities/ContactQuality';
import { evaluationLabel } from '../presentationLabels';

export function AttackOutcomeBar({ skill = 'attack', outcome, onOutcome }: {
  readonly skill?: Skill;
  readonly outcome?: ContactQuality;
  readonly onOutcome?: (outcome?: ContactQuality) => void;
}) {
  return (
    <div className="gesture-outcome" aria-label="Resultado da ação">
      {(['#', '+', '-', '='] as const).map(grade => (
        <button key={grade} type="button"
          aria-label={`Qualidade ${grade} · ${evaluationLabel(skill, grade)}`}
          aria-pressed={outcome === grade}
          onClick={() => onOutcome?.(outcome === grade ? undefined : grade)}>
          <strong>{grade}</strong><span>{evaluationLabel(skill, grade)}</span>
        </button>
      ))}
    </div>
  );
}
