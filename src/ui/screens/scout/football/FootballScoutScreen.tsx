import { useState } from 'react';
import type { MatchWorkspace, ObserveFootballControlInput, RegisterFootballEventInput, SaveFootballAssistedRecordingInput } from '../../../../application/ScoutTrainerService';
import { FootballMinimalScoutScreen } from './FootballMinimalScoutScreen';
import { FootballAssistedReviewScreen } from './FootballAssistedReviewScreen';

export interface FootballScoutScreenProps {
  readonly workspace: MatchWorkspace;
  readonly busy?: boolean;
  readonly onRegister: (input: RegisterFootballEventInput) => Promise<void>;
  readonly onCorrect: (eventId: string, input: RegisterFootballEventInput) => Promise<void>;
  readonly onOrientation: (period: 1 | 2, teamId: string, direction: 'x120' | 'x0' | undefined) => Promise<void>;
  readonly onObserve: (observation: ObserveFootballControlInput) => Promise<void>;
  readonly onUndo: () => Promise<void>;
  readonly onSaveAssisted: (eventId: string, input: SaveFootballAssistedRecordingInput, options?: { readonly silent?: boolean }) => Promise<void>;
  readonly onClock: (change: { readonly kind: 'start' | 'pause' | 'adjust' | 'period'; readonly elapsedMs?: number; readonly period?: 1 | 2 }) => Promise<void>;
  readonly onScoreAdjust: (teamId: string, delta: -1 | 1) => Promise<void>;
  readonly onExportBackup: () => void;
  readonly onExportStatsBomb: () => void;
  /** Lets the compact match navigation open a football-only destination. */
  readonly presentation?: FootballScoutPresentation;
  readonly onPresentationChange?: (presentation: FootballScoutPresentation) => void;
}

export type FootballScoutPresentation = 'minimal' | 'review';

/** A single recorder, plus voluntary review of assisted suggestions. */
export function FootballScoutScreen(props: FootballScoutScreenProps) {
  const [localPresentation, setLocalPresentation] = useState<FootballScoutPresentation>('minimal');
  const presentation = props.presentation ?? localPresentation;
  function setPresentation(next: FootballScoutPresentation) {
    props.onPresentationChange?.(next);
    setLocalPresentation(next);
  }
  if (presentation === 'review') return <FootballAssistedReviewScreen workspace={props.workspace} busy={props.busy} onSaveAssisted={props.onSaveAssisted} onBack={() => setPresentation('minimal')} />;
  return <FootballMinimalScoutScreen {...props} onReview={() => setPresentation('review')} />;
}
