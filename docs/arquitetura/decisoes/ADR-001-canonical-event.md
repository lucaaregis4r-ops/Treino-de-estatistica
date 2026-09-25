> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-001 — Evento canônico

## Context

Perfis diferentes podem representar o mesmo acontecimento esportivo com códigos distintos.

## Decision

O texto original será preservado, mas estado de partida, estatísticas e exportações consumirão
`ScoutEvent`, independente da sintaxe digitada.

## Consequences

Parser e mapper ficam fora da UI; eventos podem ser auditados e reprocessados.

## Alternatives considered

Armazenar apenas o código bruto foi rejeitado por acoplar todo consumidor à sintaxe.
