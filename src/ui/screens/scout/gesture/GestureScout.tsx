import type { ContactQuality } from '../../../../domain/scout/entities/ContactQuality';
import { useState } from 'react';
import type { SetLineup } from '../../../../domain/match/lineup/SetLineup';
import type { Skill } from '../../../../domain/scout/entities/Skill';
import type { SpatialMetadata } from '../../../../domain/scout/spatial/SpatialMetadata';
import type { AttackBlockOutcome } from '../../../../domain/scout/tactical/TacticalMetadata';
import { GestureCourtInput } from '../GestureCourtInput';
import { AttackOutcomeBar } from './AttackOutcomeBar';
import { PlayerQuickPicker } from './PlayerQuickPicker';
import { QuickActionRail, type QuickAction } from './QuickActionRail';
import { AttackBlockSelector, type AttackBlockerOption } from '../AttackBlockSelector';
import { SKILL_LABELS } from '../presentationLabels';
import './gesture.css';
import '../football/FootballActionPanel.css';
import { FootballContextDrawer } from '../football/FootballContextDrawer';
import '../football/FootballContext.css';

export interface GesturePlayerSuggestion {
  readonly automatic?: string;
  readonly highlighted: readonly string[];
  readonly others: readonly string[];
}

export interface GestureScoutProps {
  readonly sport?: 'volleyball' | 'football';
  readonly playerStats?: { readonly actions: number; readonly points: number; readonly errors: number };
  readonly phase: string;
  readonly skill: Skill;
  readonly teamName?: string;
  readonly sendingTeamId?: string;
  readonly teamOptions?: readonly { readonly id: string; readonly name: string }[];
  readonly onFreeBallTeamChange?: (teamId: string) => void;
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
  readonly courtPlayers?: readonly {
    readonly position: number;
    readonly player?: { readonly id: string };
  }[];
  readonly courtTeamNames?: readonly [string, string];
  readonly selectedPlayerId?: string;
  readonly playerSelection?: 'identified' | 'unidentified';
  readonly outcome?: ContactQuality;
  readonly blockOutcome?: AttackBlockOutcome;
  readonly blockerIds?: readonly string[];
  readonly blockers?: readonly AttackBlockerOption[];
  readonly committing?: boolean;
  readonly error?: string;
  readonly draftKey?: number;
  readonly onTrajectory?: (trajectory: SpatialMetadata) => void;
  readonly onPlayerSelected?: (playerId?: string) => void;
  readonly onAttackOutcome?: (outcome?: ContactQuality) => void;
  readonly onBlockOutcome?: (outcome: AttackBlockOutcome) => void;
  readonly onBlockersChange?: (ids: readonly string[]) => void;
  readonly onQuickAction?: (action: QuickAction) => void;
  readonly faultPointTeamName?: string;
  readonly onCancelQuickAction?: () => void;
  readonly onUndo?: () => void;
  readonly onCommit?: () => void;
}

export function GestureScout({
  playerStats,
  sport = 'volleyball',
  phase,
  skill,
  teamName,
  sendingTeamId,
  teamOptions,
  onFreeBallTeamChange,
  trajectoryReady,
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
  courtPlayers,
  courtTeamNames,
  selectedPlayerId,
  playerSelection,
  outcome,
  blockOutcome = 'none',
  blockerIds = [],
  blockers = [],
  committing,
  error,
  draftKey,
  onTrajectory,
  onPlayerSelected,
  onAttackOutcome,
  onBlockOutcome,
  onBlockersChange,
  onQuickAction,
  faultPointTeamName,
  onCancelQuickAction,
  onUndo,
  onCommit,
}: GestureScoutProps) {
  const [quickActionState, setQuickActionState] = useState<{ draftKey?: number; action?: QuickAction }>({ draftKey });
  const selectedQuickAction = quickActionState.draftKey === draftKey ? quickActionState.action : undefined;
  const effectivePlayerId = playerSelection === 'unidentified'
    ? undefined
    : selectedPlayerId ?? suggestion.automatic;
  const playerLabel = effectivePlayerId ? playerTitles?.[effectivePlayerId] : undefined;
  const selectedFault = selectedQuickAction && selectedQuickAction !== 'free_ball'
    ? selectedQuickAction
    : undefined;
  const faultLabel = selectedFault
    ? ({
        net_touch: 'Toque na rede',
        invasion: 'Invasão',
        double_touch: 'Dois toques',
        rotation_error: 'Erro de rotação',
      } as const)[selectedFault]
    : undefined;
  function cancelQuickAction() {
    setQuickActionState({ draftKey });
    onCancelQuickAction?.();
  }
  const instruction = selectedFault
    ? `${faultLabel} — ${teamName ?? 'Equipe não identificada'} · ponto: ${faultPointTeamName ?? 'adversário'}`
    : freeBallSelected && !trajectoryReady
    ? 'Trace o passe enviado ao outro lado da rede'
    : !trajectoryReady
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
        if (
          (event.key === '#' || event.key === '+' || event.key === '-' || event.key === '=') && !event.repeat && onAttackOutcome) {
          event.preventDefault();
          onAttackOutcome(outcome === event.key ? undefined : event.key);
        }
      }}
    >
      <div className="gesture-preparation-panel">
        <div className="gesture-scout-status" role="status" data-phase={phase}>
          <span>01 · Atleta da ação</span>
          <strong>{playerLabel ?? 'Sem atleta identificado'}</strong>
          <small>{SKILL_LABELS[skill]}{teamName ? ` · ${teamName}` : ''}</small>
        </div>
        <div className="gesture-control-group">
          <strong className="sr-only">Atleta</strong>
          <PlayerQuickPicker
            suggestion={suggestion}
            playerLabels={playerLabels}
            playerTitles={playerTitles}
            playerNames={playerNames}
            lineup={lineup}
            rosterIds={rosterIds}
            liberoIds={liberoIds}
            courtPlayers={courtPlayers}
            selectedPlayerId={selectedPlayerId}
            playerSelection={playerSelection}
            onSelect={onPlayerSelected}
            allowUnidentified
          />
        </div>
        {playerStats && <div className="court-player-stats" key={effectivePlayerId} aria-label="Estatísticas do atleta selecionado">
          <span><b>{playerStats.actions}</b>ações</span><span><b>{playerStats.points}</b>pontos</span><span><b>{playerStats.errors}</b>erros</span>
          <small>Observados nesta partida</small>
        </div>}
        {error && <p className="gesture-scout-error" role="alert">{error}</p>}
      </div>
      {sport === 'football' && <FootballContextDrawer />}
      {!selectedFault && (
        <GestureCourtInput key={draftKey} onTrajectory={onTrajectory} teamNames={courtTeamNames} sport={sport} />
      )}
      <div className="gesture-action-options">
        <label className="gesture-rapid-control"><input type="checkbox" checked={rapid ?? false}
          onChange={(event) => onRapidChange?.(event.target.checked)} />Registrar ao soltar
          <small>{rapid ? 'Escolha atleta e qualidade antes de arrastar. Soltar salva.' : 'Arraste e confirme com Registrar. O modo rápido é opcional.'}</small>
        </label>
        {!selectedFault && (
          <div className="gesture-control-group">
            <strong>03 · Resultado</strong>
            <AttackOutcomeBar
              skill={skill}
              outcome={outcome}
              onOutcome={(outcome) => {
                onAttackOutcome?.(outcome);
              }}
            />
          </div>
        )}
        {!selectedFault && skill === 'attack' && (
          <div className="gesture-control-group">
            <AttackBlockSelector
              value={blockOutcome}
              blockerIds={blockerIds}
              blockers={blockers}
              onChange={onBlockOutcome ?? (() => undefined)}
              onBlockersChange={onBlockersChange ?? (() => undefined)}
            />
          </div>
        )}
        <div className="gesture-control-group gesture-secondary-actions">
          <strong>Ações da jogada</strong>
          <QuickActionRail
            selectedAction={freeBallSelected ? 'free_ball' : selectedQuickAction}
            onAction={(action) => {
              setQuickActionState({ draftKey, action: selectedQuickAction === action ? undefined : action });
              onQuickAction?.(action);
            }}
          />
          {freeBallSelected && teamOptions && (
            <label className="gesture-free-ball-team">
              Equipe que envia a bola de graça
              <select aria-label="Equipe que envia a bola de graça" value={sendingTeamId ?? ''} onChange={(event) => onFreeBallTeamChange?.(event.target.value)}>
                {teamOptions.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <small>Registre o passe que cruzou a rede. A próxima ação será sugerida para o adversário.</small>
            </label>
          )}
        </div>
      </div>
      <div className="gesture-operation-bar" aria-label="Confirmação da ação">
        <span aria-live="polite">{selectedFault ? `${faultLabel} — ${teamName ?? 'Equipe não identificada'} · Ponto: ${faultPointTeamName ?? 'adversário'}` : instruction}</span>
        <button className="gesture-scout-undo" type="button" onClick={selectedFault ? cancelQuickAction : onUndo}>
          ↶ Desfazer
        </button>
        <button className="gesture-scout-commit" type="button" disabled={committing} onClick={onCommit}>
          {committing ? 'Registrando…' : 'Registrar · Enter'}
        </button>
      </div>
    </section>
  );
}
