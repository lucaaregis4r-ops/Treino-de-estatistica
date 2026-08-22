# ADR-003 — Event sourcing simples

## Context

Partidas precisam suportar auditoria, correção, undo, redo e reconstrução após recarga.

## Decision

O log ordenado de eventos será a fonte de verdade; o estado da partida será uma projeção
determinística reconstruível por replay.

## Consequences

Correções não apagarão silenciosamente o histórico. Reducers deverão ser determinísticos.

## Alternatives considered

Persistir apenas o estado atual foi rejeitado por dificultar auditoria e recuperação.
