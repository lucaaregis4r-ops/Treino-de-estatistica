# ADR-013 — Contexto do levantador derivado dos ataques

## Status

Accepted — 2026-09-01.

## Context

O fluxo normal do voleibol contém levantamento entre recepção e ataque, mas exigir o scout explícito
de todo levantamento reduziria a velocidade de captura e contrariaria o modelo atual, que já conhece
lineup, rotação e levantador ativo.

## Decision

Levantamentos normais serão inferidos do ataque efetivo e do contexto do levantador ativo. A
projeção tática fornecerá identidade do levantador, posição P1–P6, atacante, rotação, recepção
relacionada, fase e combinação disponível.

Somente ações de levantamento observáveis de modo independente, como erro de levantamento sem
ataque subsequente, serão registradas explicitamente. O sistema não criará eventos sintéticos de
levantamento para facilitar estatísticas.

Analytics do levantador na V3 será baseado em ataques: distribuição, conversão, repetição e
evenness. Set Assist Rate dependente do registro de todos os levantamentos não faz parte da V3.

## Consequences

- O operador não precisa registrar um contato implícito a cada ataque.
- Correção, undo, redo e replay continuam aplicados somente a ações efetivamente registradas.
- Analytics deve usar `ActiveSetterResolver`/`TacticalRallyProjection` e declarar indisponibilidade
  quando o contexto não puder ser determinado.

## Alternatives considered

Gerar um `ScoutEvent` fictício entre recepção e ataque foi rejeitado porque poluiria a fonte de
verdade e confundiria eventos observados com inferências.
