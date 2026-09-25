> **Versão/escopo:** Transversal; versões e datas registradas no conteúdo original.
> **Classificação:** Referência arquitetural histórica; conferir implementação atual.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR-004 — Local-first

## Context

O treinamento deve funcionar com baixa dependência operacional e preservar a privacidade dos dados.

## Decision

Partidas e profiles serão armazenados localmente por adapters; o domínio não dependerá de IndexedDB.

## Consequences

O produto funciona sem backend e poderá trocar de armazenamento pelas portas da aplicação.

## Alternatives considered

Backend obrigatório e armazenamento direto no domínio foram rejeitados para o escopo inicial.
