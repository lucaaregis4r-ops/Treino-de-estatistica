# ADR-012 — Pipeline canônico compartilhado para entrada visual

## Status

Accepted — 2026-09-01.

## Context

A V3 adicionará entrada visual e híbrida sem substituir a entrada digitada. Fazer a UI visual
fabricar um código textual para atravessar tokenizer/parser esconderia a origem real da captura e
criaria acoplamento indevido à sintaxe de um `CodeProfile`.

## Decision

Entradas digitada, visual e híbrida convergirão em `CanonicalScoutEventCandidate` e compartilharão
uma única etapa de validação, completude e criação de `ScoutEvent`.

O caminho digitado continuará usando Normalizer, Tokenizer, Parser e SemanticMapper. O caminho
visual usará um `VisualScoutDraft` e um `VisualScoutMapper`; ele não passará pelo parser. O modo
híbrido combinará texto e detalhes visuais antes de criar um único candidato e um único evento.

`rawCode` continuará obrigatório na V3. Capturas visuais usarão uma representação de auditoria
humana iniciada por `[VISUAL]`, nunca interpretada como código digitado. A proveniência será
registrada como `typed | visual | hybrid` sem criar tipos concorrentes de evento.

## Consequences

- Parser, profiles e atalhos digitados permanecem compatíveis.
- ValidationEngine, CompletenessEvaluator, EventFactory, persistência, replay e analytics continuam
  únicos.
- Um gesto visual e um código híbrido não podem gerar eventos duplicados.
- A Macro 20 precisará extrair a etapa comum hoje embutida em `RegisterScoutEventUseCase`.

## Alternatives considered

Fabricar uma string para o parser e criar `VisualEvent`/`TypedEvent` separados foram rejeitados por
ocultar a proveniência e criar fontes de verdade concorrentes.
