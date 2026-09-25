> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-010: Rally result as the source of score, serve, and rotation

## Status

Accepted — 2026-08-09.

## Decision

A terminal canonical scout contact is interpreted by `RallyOutcomeResolver`. When its winner is
reliable, the application appends an explicit `rally_result` event containing the winner, rally,
previous serving team, reason, and source history identity.

`MatchReducer` is the only component that projects this event into score, serving team, rally state,
and rotation. A receiving team that wins rotates once; a serving team that wins does not rotate.
Manual point corrections append the same event type with an audit reason. Set completion is recorded
by a separate `set_finished` event derived from configurable scoring rules.

Correction, undo, and redo select the result linked to the effective scout history version. Reload
replays the ordered log and therefore reconstructs the same score, serve, and rotation.

## Consequences

- React cannot silently mutate score or rotation.
- Automatic and manual outcomes remain auditable.
- Existing legacy score events remain readable for backward compatibility.
- Full libero and competition-specific rules remain outside this decision.
