> **Versão/escopo:** 0.45 (roadmap; correspondência SemVer proposta no pacote: 0.4.5).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# ADR — BYOK de IA (M6)

Status: contrato futuro já atendido pela porta/adaptador M5.

Chaves são fornecidas em memória, nunca entram em IndexedDB, backup, exportação ou logs. A IA recebe somente DTOs agregados locais; narrativa é opt-in do usuário e não participa do cálculo analítico.
