> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-002 — Separação dos profiles

## Context

Sintaxe, dificuldade, regras competitivas e exercícios mudam por motivos diferentes.

## Decision

Manter `CodeProfile`, `ComplexityProfile`, `CompetitionProfile` e `TrainingProfile` como contratos
separados, compostos pelo `ProfileResolver`.

## Consequences

Um novo padrão de código não exige mudanças nas regras de competição ou no parser estrutural.

## Alternatives considered

Um profile único foi rejeitado porque criaria combinações duplicadas e versões acopladas.
