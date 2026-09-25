> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-005: Profile-driven continuous input framing

## Status

Accepted — 2026-08-09.

## Decision

Continuous keyboard input is segmented before the existing scout pipeline by `InputBuffer`,
`ScoutCodeFramer`, and `ContinuousInputController`. The framer derives its finite structural language
from the active `CodeProfile`; it does not interpret volleyball or create canonical events.

An event boundary is accepted when a complete candidate is followed by an unequivocal prefix of a
new candidate. The final complete candidate is committed after a configurable idle window. Enter is
retained as an optional manual commit. Incomplete or invalid candidates remain editable and never
reach persistence.

Every committed frame is sent, in order, through the existing normalizer, tokenizer, parser, mapper,
validators, and event factory. UI persistence is serialized so fast input cannot reorder events.

## Consequences

- There is still one parser and one canonical validation path.
- Framing adapts to grammar order and token values in custom CodeProfiles.
- Ambiguous continuations stay buffered until they become unequivocal or idle-committable.
- Completeness warnings and late tactical enrichment remain separate work for Macro 11.
