import { useMemo } from 'react';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { ScoutCodeFramer } from '../../../domain/scout/input/ScoutCodeFramer';
import type { CodeProfile, TacticalInputField } from '../../../profiles/types';
import { ATTACK_COMBINATION_EXAMPLES } from './attackCombinationOptions';
import { EVALUATION_LABELS, SKILL_LABELS } from './presentationLabels';

interface ScoutCaptureHelpProps {
  readonly enabled: boolean;
  readonly rawCode: string;
  readonly profile: CodeProfile;
  readonly onToggle: () => void;
}

interface HelpItem {
  readonly field: TacticalInputField;
  readonly token: string;
  readonly label: string;
  readonly examples: string;
}

const HELP_BY_SKILL: Readonly<Record<Skill, readonly HelpItem[]>> = {
  serve: [
    {
      field: 'skillType',
      token: 'Y',
      label: 'Tipo do saque',
      examples: 'YQ viagem · YM flutuante salto · YH apoio · YT híbrido',
    },
    { field: 'origin', token: 'O', label: 'Origem', examples: 'O1 até O6' },
    { field: 'target', token: 'T', label: 'Destino', examples: 'T1 até T6' },
    {
      field: 'direction',
      token: 'D',
      label: 'Direção',
      examples: 'DD diagonal · DP paralela · DG paragonal',
    },
  ],
  reception: [{ field: 'origin', token: 'O', label: 'Zona do contato', examples: 'O1 até O6' }],
  set: [
    { field: 'target', token: 'T', label: 'Zona do atacante', examples: 'T2 · T3 · T4' },
    { field: 'setterCall', token: 'L', label: 'Chamada', examples: 'L7 · LK1' },
  ],
  attack: [
    {
      field: 'skillType',
      token: 'Y',
      label: 'Tipo do ataque',
      examples: 'YP potência · YL largada',
    },
    {
      field: 'origin',
      token: 'O',
      label: 'Exceção de origem',
      examples: 'Automática pela posição; use O1 até O6 somente fora do padrão',
    },
    {
      field: 'direction',
      token: 'D',
      label: 'Direção',
      examples: 'DD diagonal · DP paralela · DG paragonal',
    },
    {
      field: 'combination',
      token: 'C',
      label: 'Combinação (opcional)',
      examples: ATTACK_COMBINATION_EXAMPLES,
    },
    { field: 'tempo', token: 'Q', label: 'Tempo', examples: 'Q1 · Q2 · Q3' },
    { field: 'blockers', token: 'B', label: 'Bloqueadores', examples: 'B0 até B3' },
  ],
  block: [
    { field: 'blockers', token: 'B', label: 'Bloqueadores', examples: 'B1 · B2 · B3' },
    { field: 'target', token: 'T', label: 'Zona do toque', examples: 'T1 até T6' },
  ],
  dig: [{ field: 'origin', token: 'O', label: 'Zona da defesa', examples: 'O1 até O6' }],
  free_ball: [
    { field: 'origin', token: 'O', label: 'Origem', examples: 'O1 até O6' },
    { field: 'target', token: 'T', label: 'Destino', examples: 'T1 até T6' },
    {
      field: 'direction',
      token: 'D',
      label: 'Direção',
      examples: 'DD diagonal · DP paralela · DG paragonal',
    },
  ],
};

const framer = new ScoutCodeFramer();

function interpretation(rawCode: string, profile: CodeProfile) {
  const decoded = framer.decode(rawCode, profile);
  if (!decoded) return undefined;
  const evaluationEntry = Object.keys(profile.evaluations).find((symbol) =>
    decoded.coreCode.endsWith(symbol),
  );
  if (!evaluationEntry) return undefined;
  const withoutEvaluation = decoded.coreCode.slice(0, -evaluationEntry.length);
  const skillEntry = Object.entries(profile.skills)
    .sort(([left], [right]) => right.length - left.length)
    .find(([code]) => withoutEvaluation.endsWith(code));
  if (!skillEntry) return undefined;
  return {
    skill: skillEntry[1],
    evaluation: evaluationEntry,
    tacticalTokens: decoded.tacticalTokens.map((token) => token.toUpperCase()),
  };
}

export function ScoutCaptureHelp({ enabled, rawCode, profile, onToggle }: ScoutCaptureHelpProps) {
  const parsed = useMemo(() => interpretation(rawCode, profile), [profile, rawCode]);
  return (
    <aside
      className={enabled ? 'capture-help enabled' : 'capture-help'}
      aria-label="Ajuda do código"
    >
      <button type="button" aria-pressed={enabled} onClick={onToggle}>
        {enabled ? 'Ocultar ajuda' : 'Habilitar ajuda'}
      </button>
      {enabled && (
        <div className="capture-help-content" aria-live="polite">
          {!parsed ? (
            <p>
              Digite equipe, camisa, fundamento e avaliação. Exemplo: <code>*08S#</code>.
            </p>
          ) : (
            <>
              <p>
                <strong>{SKILL_LABELS[parsed.skill]}</strong> ·{' '}
                <span className="capture-help-evaluation">
                  {EVALUATION_LABELS[parsed.skill]?.[parsed.evaluation] ??
                    profile.evaluations[parsed.evaluation]}
                </span>
              </p>
              <span>Você pode complementar antes do próximo código:</span>
              {parsed.skill === 'attack' && (
                <p className="capture-help-note">
                  A origem é preenchida pela posição do atacante. Use <code>/</code> quando o ataque
                  for abafado pelo bloqueio.
                </p>
              )}
              <ul>
                {HELP_BY_SKILL[parsed.skill].map((item) => {
                  const configuredPrefix =
                    profile.tacticalInput?.fields[item.field]?.prefix.toUpperCase() ?? item.token;
                  const captured = parsed.tacticalTokens.some((token) =>
                    token.startsWith(configuredPrefix),
                  );
                  return (
                    <li key={item.field} className={captured ? 'captured' : ''}>
                      <code>{configuredPrefix}</code>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{captured ? 'Informado' : item.examples}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
