> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-008: Late enrichment through immutable correction history

## Status

Accepted — 2026-08-09.

## Decision

Validity and completeness are independent. Only fields classified as `blocking` participate in the
blocking validation result. Missing `recommended` fields produce a persisted `CompletenessResult`
with status `partial`; `optional` fields stay silent and `derived` fields belong to context resolvers.

Late tactical details reuse the existing `scout_corrected` event. The replacement keeps the same raw
code when only metadata changes, contains the merged metadata, and receives a newly evaluated
completeness snapshot. The original scout event remains unchanged.

We will not add a separate `scout_enriched` event while correction history provides the required
audit, ordering, undo, redo, and replay semantics.

## Consequences

- A valid contact is never lost because recommended tactical detail is absent.
- UI feedback can show exactly which recommended fields are missing after reload.
- Metadata-only changes remain auditable and reversible.
- If future patch semantics require field removal or concurrent enrichment, this decision must be
  revisited before introducing a specialized enrichment event.
