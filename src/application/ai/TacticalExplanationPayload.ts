import type {
  TacticalQuestionAnswer,
  TacticalQuestionFinding,
} from '../analytics/TacticalQuestionService';

export interface TacticalExplanationFinding {
  readonly findingId: string;
  readonly label: string;
  readonly numbers: Readonly<Record<string, number | null>>;
  readonly sample: {
    readonly n: number;
    readonly unit: 'rally' | 'event';
  };
  readonly baseline?: Readonly<Record<string, number | null>>;
  readonly available: boolean;
  readonly caveats: readonly string[];
}

export interface TacticalExplanationPayload {
  readonly schemaVersion: 'scout-trainer-0.45';
  readonly questionId: TacticalQuestionAnswer['questionId'];
  readonly answerType: TacticalQuestionAnswer['answerType'];
  readonly status: TacticalQuestionAnswer['status'];
  readonly filters: {
    readonly setNumber?: number;
    readonly rotation?: number;
    readonly phase?: TacticalQuestionAnswer['filters']['phase'];
    readonly receptionGrade?: TacticalQuestionAnswer['filters']['receptionGrade'];
  };
  readonly sample: TacticalQuestionAnswer['sample'];
  readonly findings: readonly TacticalExplanationFinding[];
  readonly caveats: readonly string[];
}

function findingPayload(finding: TacticalQuestionFinding): TacticalExplanationFinding {
  return {
    findingId: finding.findingId,
    label: finding.label,
    numbers: { ...finding.numbers },
    sample: { n: finding.sample.n, unit: finding.sample.unit },
    ...(finding.baseline ? { baseline: { ...finding.baseline } } : {}),
    available: finding.available,
    caveats: [...finding.caveats],
  };
}

/** Allowlist projection: the provider receives aggregates, never ScoutEvent or x/y. */
export function buildTacticalExplanationPayload(answer: TacticalQuestionAnswer): TacticalExplanationPayload {
  return {
    schemaVersion: 'scout-trainer-0.45',
    questionId: answer.questionId,
    answerType: answer.answerType,
    status: answer.status,
    filters: {
      ...(answer.filters.setNumber !== undefined ? { setNumber: answer.filters.setNumber } : {}),
      ...(answer.filters.rotation !== undefined ? { rotation: answer.filters.rotation } : {}),
      ...(answer.filters.phase !== undefined ? { phase: answer.filters.phase } : {}),
      ...(answer.filters.receptionGrade !== undefined ? { receptionGrade: answer.filters.receptionGrade } : {}),
    },
    sample: { ...answer.sample },
    findings: answer.findings.map(findingPayload),
    caveats: [...answer.caveats],
  };
}
