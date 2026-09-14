# ADR-014 — Snapshot analítico como cache reconstruível

## Status

Accepted — 2026-09-01; implementação prevista para a Macro 21.

## Context

Analytics histórico precisa agregar várias partidas sem recalcular indefinidamente todos os logs,
mas o produto já depende de event sourcing, correções imutáveis e replay determinístico.

## Decision

`MatchEvent`/`ScoutEvent` efetivo continuará sendo a única fonte de verdade. Um
`MatchAnalyticsSnapshot` poderá ser persistido somente como cache reconstruível.

O cache carregará versão do schema analítico, quantidade de eventos-fonte e última sequência. Será
invalidado quando qualquer um desses marcadores divergir do log atual. Apagar todos os snapshots não
poderá causar perda de dados nem alterar o resultado após reconstrução.

A migração IndexedDB v4→v5 e a store `analyticsSnapshots` ocorrerão somente na Macro 21.

## Consequences

- Correções, undo e redo invalidam resultados derivados em vez de reescrever a verdade histórica.
- Evoluções de fórmula podem invalidar snapshots pela versão do schema.
- Gráficos e filtros de UI não serão persistidos.
- O histórico pode obter desempenho incremental sem abandonar o modelo local-first.

## Alternatives considered

Persistir totais analíticos como fonte primária foi rejeitado por permitir divergência em relação ao
log. Recalcular todas as partidas em toda abertura foi rejeitado como estratégia única por não
escalar para histórico maior.
