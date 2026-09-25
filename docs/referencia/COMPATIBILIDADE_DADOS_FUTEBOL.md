> **Versão/escopo:** Transversal; base documentada 0.4.0 / backup 1.1.0.
> **Classificação:** Contrato de referência; conferir o código antes de atualizar.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../COMECE_AQUI.md).

# Compatibilidade de dados do futebol

## Fonte de verdade

O backup JSON do Scout Trainer, atualmente na versão `1.1.0`, é a representação completa e recuperável da partida. Ele inclui metadados, equipes, atletas, envelopes append-only, eventos canônicos, correções, desfazimentos, relógio e ajustes manuais. O placar, a posse exibida e as visualizações são projeções desses registros, não contadores independentes.

Backups `1.0.0` continuam aceitos. A importação os normaliza em memória para `1.1.0`, acrescentando apenas modalidade e manifesto; os eventos originais não são reescritos. O banco IndexedDB não precisou de nova store nem de migração destrutiva: os tipos novos usam a store append-only de eventos existente.

## Subconjunto StatsBomb Open Data v4.0.0

A exportação de intercâmbio aceita somente eventos locais validados e observados. Campos suportados: `id`, `index`, `period`, `timestamp`, `minute`, `second`, `type`, `team`, `player`, `possession`, `possession_team`, `location`, `pass`, `carry`, `shot`, `dribble`, `duel`, `substitution` e `related_events`.

Fontes conferidas em 20/09/2026: [repositório oficial Open Data](https://github.com/hudl/open-data), sua [documentação de eventos](https://github.com/statsbomb/open-data/blob/master/doc/StatsBomb%20Open%20Data%20Specification%20v1.1.pdf) e a descrição oficial de que os arquivos Open Data são JSON exportados da API. A fixture pinada do projeto permanece offline e nenhuma dessas fontes é consultada durante o registro de jogo.

- Localizações usam 0–120 × 0–80. Ausência permanece ausência; o centro do campo nunca é usado como preenchimento.
- Passe completo não recebe `pass.outcome`; passe incompleto recebe resultado somente porque foi informado pelo operador.
- Equipe, atleta, posse e destino só aparecem quando registrados.
- `scout_trainer` existe no backup completo e é omitido do JSON puro de intercâmbio.
- A exportação não fabrica xG, tracking, sucesso, pressão, formação ou `Ball Receipt*`.
- Eventos inválidos são listados no manifesto como omitidos, com motivo; não são corrigidos silenciosamente.

O manifesto da exportação informa contrato, campos cobertos, limitações e omissões. Isso declara compatibilidade de subconjunto, não equivalência integral com todos os eventos produzidos pela StatsBomb.

## Dados importados e modelos

O adaptador Open Data preserva o objeto `raw` e campos desconhecidos no backup completo. Probabilidades e referências externas permanecem separadas de eventos observados. Esta etapa não altera Markov, xG, pesos, fixture pinada nem parâmetros de `3+1`.
