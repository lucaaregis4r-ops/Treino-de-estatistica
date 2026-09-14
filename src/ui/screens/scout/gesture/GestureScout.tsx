import { useEffect, useState } from 'react';
import type { SetLineup } from '../../../../domain/match/lineup/SetLineup';
import type { Skill } from '../../../../domain/scout/entities/Skill';
import type { SpatialMetadata } from '../../../../domain/scout/spatial/SpatialMetadata';
import { GestureCourtInput } from '../GestureCourtInput';
import { AttackOutcomeBar } from './AttackOutcomeBar';
import { PlayerQuickPicker } from './PlayerQuickPicker';
import { QuickActionRail, type QuickAction } from './QuickActionRail';
import { SKILL_LABELS } from '../presentationLabels';
import './gesture.css';

export interface GesturePlayerSuggestion {
  readonly automatic?: string;
  readonly highlighted: readonly string[];
  readonly others: readonly string[];
}

export interface GestureScoutProps {
  readonly phase: string;
  readonly skill: Skill;
  readonly teamName?: string;
  readonly trajectoryReady?: boolean;
  readonly attackOutcomeAvailable?: boolean;
  readonly suggestion: GesturePlayerSuggestion;
  readonly playerLabels?: Readonly<Record<string, string>>;
  readonly playerTitles?: Readonly<Record<string, string>>;
  readonly playerNames?: Readonly<Record<string, string>>;
  readonly rapid?: boolean;
  readonly onRapidChange?: (rapid: boolean) => void;
  readonly freeBallSelected?: boolean;
  readonly lineup?: SetLineup;
  readonly rosterIds?: readonly string[];
  readonly liberoIds?: readonly string[];
  readonly courtTeamNames?: readonly [string, string];
  readonly selectedPlayerId?: string;
  readonly playerSelection?: 'identified' | 'unidentified';
  readonly outcome?: '#' | '=';
  readonly committing?: boolean;
  readonly error?: string;
  readonly draftKey?: number;
  readonly onTrajectory?: (trajectory: SpatialMetadata) => void;
  readonly onPlayerSelected?: (playerId?: string) => void;
  readonly onAttackOutcome?: (outcome?: '#' | '=') => void;
  readonly onQuickAction?: (action: QuickAction) => void;
  readonly onUndo?: () => void;
  readonly onCommit?: () => void;
}

export function GestureScout({
  phase,
  skill,
  teamName,
  trajectoryReady,
  attackOutcomeAvailable,
  suggestion,
  playerLabels,
  playerTitles,
  playerNames,
  rapid,
  onRapidChange,
  freeBallSelected,
  lineup,
  rosterIds,
  liberoIds,
  courtTeamNames,
  selectedPlayerId,
  playerSelection,
  outcome,
  committing,
  error,
  draftKey,
  onTrajectory,
  onPlayerSelected,
  onAttackOutcome,
  onQuickAction,
  onUndo,
  onCommit,
}: GestureScoutProps) {
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickAction>();
  useEffect(() => {
    setSelectedQuickAction(undefined);
  }, [draftKey]);
  const effectivePlayerId = playerSelection === 'unidentified'
    ? undefined
    : selectedPlayerId ?? suggestion.automatic;
  const playerLabel = effectivePlayerId ? playerTitles?.[effectivePlayerId] : undefined;
  const instruction = !trajectoryReady
    ? 'Trace a trajetória da bola'
    : !effectivePlayerId
      ? 'Trajetória pronta · Sem atleta identificado'
      : `${playerLabel ?? 'Atleta selecionado'} · Pronto para registrar`;
  return (
    <section
      className="gesture-scout"
      aria-label="Scout gestual"
      aria-busy={committing}
      inert={committing || undefined}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('input,select,textarea,[data-native-keys]') || event.nativeEvent.isComposing) return;
        if ((skill === 'serve' || skill === 'attack' || attackOutcomeAvailable) &&
          (event.key === '#' || event.key === '=') && !event.repeat && onAttackOutcome) {
          event.preventDefault();
          onAttackOutcome(outcome === event.key ? undefined : event.key);
        }
      }}
    >
      <div className="gesture-preparation-panel">
        <div className="gesture-scout-status sr-only" role="status" data-phase={phase}>
          <span>AÇÃO ATUAL</span>
          <strong>{SKILL_LABELS[skill].toUpperCase()}{teamName ? ` — ${teamName}` : ''}</strong>
          <small>{instruction}</small>
        </div>
        <div className="gesture-control-group">
          <strong>Atleta</strong>
          <PlayerQuickPicker
            suggestion={suggestion}
            playerLabels={playerLabels}
            playerTitles={playerTitles}
            playerNames={playerNames}
            lineup={lineup}
            rosterIds={rosterIds}
            liberoIds={liberoIds}
            selectedPlayerId={selectedPlayerId}
            playerSelection={playerSelection}
            onSelect={onPlayerSelected}
            allowUnidentified
          />
        </div>
        {error && <p className="gesture-scout-error" role="alert">{error}</p>}
      </div>
      <GestureCourtInput key={draftKey} onTrajectory={onTrajectory} teamNames={courtTeamNames} />
      <div className="gesture-action-options">
        <label className="gesture-rapid-control"><input type="checkbox" checked={rapid ?? false}
          onChange={(event) => onRapidChange?.(event.target.checked)} />Registrar ao soltar
          <small>{rapid ? 'Escolha atleta e qualidade antes de arrastar. Soltar salva.' : 'Arraste e confirme com Registrar. O modo rápido é opcional.'}</small>
        </label>
        {(skill === 'serve' || skill === 'attack' || attackOutcomeAvailable) && (
          <div className="gesture-control-group">
            <strong>Qualidade</strong>
            <AttackOutcomeBar
              skill={skill}
              outcome={outcome}
              onOutcome={(outcome) => {
                onAttackOutcome?.(outcome);
              }}
            />
          </div>
        )}
        <div className="gesture-control-group gesture-secondary-actions">
          <strong>Ações da jogada</strong>
          <QuickActionRail
            selectedAction={freeBallSelected ? 'free_ball' : selectedQuickAction}
            onAction={(action) => {
              setSelectedQuickAction(selectedQuickAction === action ? undefined : action);
              onQuickAction?.(action);
            }}
          />
        </div>
      </div>
      <div className="gesture-operation-bar" aria-label="Confirmação da ação">
        <span>{trajectoryReady ? 'Trajetória pronta' : 'Trace a trajetória para registrar'}</span>
        <button className="gesture-scout-undo" type="button" onClick={onUndo}>
          ↶ Desfazer
        </button>
        <button className="gesture-scout-commit" type="button" disabled={committing} onClick={onCommit}>
          {committing ? 'Registrando…' : 'Registrar · Enter'}
        </button>
      </div>
    </section>
  );
}
