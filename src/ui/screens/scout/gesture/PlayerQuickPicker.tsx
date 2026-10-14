import { VOLLEYBALL_ZONE_ORDER } from '../../../components/volleyballCourtGeometry';
import { useState } from 'react';
import type { SetLineup } from '../../../../domain/match/lineup/SetLineup';
import type { GesturePlayerSuggestion } from './GestureScout';

export function PlayerQuickPicker({
  suggestion,
  playerLabels,
  playerTitles,
  playerNames,
  selectedPlayerId,
  playerSelection,
  onSelect,
  allowUnidentified = true,
  lineup,
  rosterIds,
  liberoIds = [],
  courtPlayers,
}: {
  readonly suggestion: GesturePlayerSuggestion;
  readonly playerLabels?: Readonly<Record<string, string>>;
  readonly playerTitles?: Readonly<Record<string, string>>;
  readonly playerNames?: Readonly<Record<string, string>>;
  readonly selectedPlayerId?: string;
  readonly playerSelection?: 'identified' | 'unidentified';
  readonly onSelect?: (playerId?: string) => void;
  readonly allowUnidentified?: boolean;
  readonly lineup?: SetLineup;
  readonly rosterIds?: readonly string[];
  readonly liberoIds?: readonly string[];
  readonly courtPlayers?: readonly {
    readonly position: number;
    readonly player?: { readonly id: string };
  }[];
}) {
  const [chosenLibero, setChosenLibero] = useState<string>();
  const players = rosterIds ?? [...suggestion.highlighted, ...suggestion.others];
  const liberos = liberoIds.filter((id) => players.includes(id));
  const liberoId =
    liberos.find((id) => id === selectedPlayerId) ??
    liberos.find((id) => id === chosenLibero) ??
    liberos.find((id) => id === suggestion.automatic) ??
    liberos[0];
  const positions = VOLLEYBALL_ZONE_ORDER;
  const onCourt = positions.map((position) => {
    if (courtPlayers) {
      const match = courtPlayers.find((c) => c.position === position);
      let playerId = match?.player?.id;
      if ([4, 3, 2].includes(position) && playerId && liberos.includes(playerId)) {
        playerId = undefined;
      }
      if (playerId) return { position, playerId };
    }
    const slot = lineup?.slots[lineup.positions[position]];
    let playerId = slot?.playerId;
    if ([4, 3, 2].includes(position) && playerId && liberos.includes(playerId)) {
      if (slot?.originalPlayerId && !liberos.includes(slot.originalPlayerId)) {
        playerId = slot.originalPlayerId;
      } else {
        playerId = undefined;
      }
    }
    return { position, playerId };
  });

  const occupiedIds = new Set(onCourt.map((c) => c.playerId).filter(Boolean));
  for (const cell of onCourt) {
    if ([4, 3, 2].includes(cell.position) && (!cell.playerId || liberos.includes(cell.playerId))) {
      const fallback = players.find((id) => !liberos.includes(id) && !occupiedIds.has(id));
      if (fallback) {
        cell.playerId = fallback;
        occupiedIds.add(fallback);
      }
    }
  }
  const reserves = players.filter(
    (id) => !liberos.includes(id) && !onCourt.some((cell) => cell.playerId === id),
  );
  const effectiveSelectedPlayerId =
    playerSelection === 'unidentified' ? undefined : (selectedPlayerId ?? suggestion.automatic);
  if (players.length === 0 && !allowUnidentified) return null;

  function playerButton(playerId: string, position?: number, libero = false) {
    const title = playerTitles?.[playerId] ?? playerLabels?.[playerId] ?? 'Atleta';
    const suggested = suggestion.highlighted.includes(playerId);
    return (
      <button
        key={playerId}
        type="button"
        data-position={position}
        className={suggested ? 'highlighted' : 'other'}
        aria-label={`${position ? `P${position} · ` : ''}${libero ? 'Líbero · ' : ''}${title}`}
        aria-pressed={effectiveSelectedPlayerId === playerId}
        title={`${title}${suggested ? ' · Sugerido para esta ação' : ''}`}
        onClick={() => onSelect?.(playerId)}
      >
        {position && <small>P{position}</small>}
        {libero && <span>Líbero</span>}
        <b>{playerLabels?.[playerId] ?? 'Atleta'}</b>
        {playerNames?.[playerId] && <span className="gesture-player-name">{playerNames[playerId]}</span>}
      </button>
    );
  }

  return (
    <div className="gesture-picker" role="group" aria-label="Selecionar atleta">
      {lineup ? (
        (['Rede', 'Fundo'] as const).map((row, index) => (
          <div
            className={`gesture-player-row ${index === 0 ? 'front' : 'back'}`}
            role="group"
            aria-label={row}
            key={row}
          >
            <strong>{row}</strong>
            <div className="gesture-player-grid">
              {onCourt.slice(index * 3, index * 3 + 3).map(({ position, playerId }) =>
                playerId && players.includes(playerId) && !liberos.includes(playerId) ? (
                  playerButton(playerId, position)
                ) : (
                  <span className="gesture-player-empty" key={position}>
                    P{position}
                    <small>
                      {playerId && liberos.includes(playerId) && ![4, 3, 2].includes(position)
                        ? 'Líbero abaixo'
                        : 'Sem atleta'}
                    </small>
                  </span>
                ),
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="gesture-player-grid">{reserves.map((id) => playerButton(id))}</div>
      )}
      <div className="gesture-player-extras">
        {liberoId && (
          <div className="gesture-libero">
            {liberos.length > 1 && (
              <label>
                Líbero disponível
                <select
                  value={liberoId}
                  onChange={(event) => {
                    setChosenLibero(event.target.value);
                    if (effectiveSelectedPlayerId && liberos.includes(effectiveSelectedPlayerId))
                      onSelect?.(event.target.value);
                  }}
                >
                  {liberos.map((id) => (
                    <option key={id} value={id}>
                      {playerTitles?.[id] ?? playerLabels?.[id]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {playerButton(liberoId, undefined, true)}
          </div>
        )}
        {lineup && reserves.length > 0 && (
          <section className="gesture-reserves" data-native-keys>
            <strong>Reservas ({reserves.length})</strong>
            <div className="gesture-player-grid">{reserves.map((id) => playerButton(id))}</div>
          </section>
        )}
      </div>
      {allowUnidentified && (
        <button
          type="button"
          className="other"
          aria-label="Sem atleta identificado"
          aria-pressed={playerSelection === 'unidentified'}
          onClick={() => onSelect?.()}
        >
          Sem atleta identificado
        </button>
      )}
      <small className="gesture-selected-name" key={effectiveSelectedPlayerId ?? 'unidentified'} aria-live="polite">
        {effectiveSelectedPlayerId
          ? playerTitles?.[effectiveSelectedPlayerId]
          : 'Sem atleta identificado'}
      </small>
      {suggestion.highlighted.length > 0 && (
        <small className="gesture-suggestion-key">
          Sugestão: {suggestion.highlighted.map((id) => playerLabels?.[id] ?? 'atleta').join(', ')}
        </small>
      )}
    </div>
  );
}
