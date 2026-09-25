> **Versão/escopo:** Fundação histórica; release não declarado.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Roadmap em 8 macroetapas

As 23 fases numeradas de 0 a 22 no plano mestre são preservadas como checklists técnicos, mas o
projeto passa a ser executado e comunicado por oito macroetapas.

| Macro | Nome                        | Fases originais   | Entrega                                              |
| ----: | --------------------------- | ----------------- | ---------------------------------------------------- |
|     1 | Fundação                    | 0–2               | Bootstrap, contratos e Profile Engine.               |
|     2 | Entrada de scout            | 3–5               | Normalização, parser, validação e eventos canônicos. |
|     3 | Partida e armazenamento     | 6–7               | Persistência local, replay e Match Engine.           |
|     4 | Primeiro produto utilizável | 8–10 + JSON da 18 | UI, Basic/Operational Profiles e exportação JSON.    |
|     5 | Scout tático e estatísticas | 11–14             | Métricas, Tactical, referência CBV e Advanced.       |
|     6 | Treinamento                 | 15–17             | Exercícios, progressão e métricas do operador.       |
|     7 | Distribuição e configuração | restante da 18–20 | CSV/TXT, editor de profiles e PWA.                   |
|     8 | Robustez e validação final  | 21–22             | Recovery, migrações, carga e E2E.                    |

## Regra de execução

Uma macroetapa pode conter várias entregas internas, mas só é concluída quando todos os checks das
fases que agrupa passam. A junção altera o gerenciamento, não as fronteiras dos módulos.

## Situação atual

- Macroetapa 1 — concluída.
- Macroetapa 2 — concluída.
- Macroetapa 3 — concluída.
- Macroetapa 4 — concluída.
- Macroetapa 5 — concluída.
- Macroetapa 6 — concluída.
- Macroetapa 7 — concluída.
- Macroetapa 8 — concluída.

As oito macroetapas estão concluídas. Novas entregas devem ser tratadas como evolução do produto.

## Evolução V2

| Macro | Entrega                                        | Situação  |
| ----: | ---------------------------------------------- | --------- |
|     9 | Core automático da partida, elenco e escalação | Concluída |
|    10 | Input contínuo                                 | Concluída |
|    11 | Captura tolerante e completude                 | Concluída |
|    12 | Domínio tático V2                              | Concluída |
|    13 | Automação contextual do rally                  | Concluída |
|    14 | Entrada tática e quadra                        | Concluída |
|    15 | Análises táticas                               | Concluída |
|    16 | Treinamento avançado e robustez V2             | Concluída |

O detalhamento e os critérios das macros 9–16 estão em `SCOUT_TRAINER_EVOLUTION_V2_2.md`.

As oito macroetapas da Evolução V2 estão concluídas.

## Evolução V3

| Macro | Entrega                                     | Situação  |
| ----: | ------------------------------------------- | --------- |
|    17 | Fundação, auditoria e contratos             | Concluída |
|    18 | Advanced Volleyball Analytics               | Concluída |
|    19 | Visual Analytics                            | Concluída |
|    20 | Scout visual/híbrido e Spatial Analytics    | Pendente  |
|    21 | Histórico, temporada e perfil de adversário | Pendente  |

A Macro 17 não altera comportamento funcional. Ela registra a convergência de todas as formas de
entrada em `CanonicalScoutEventCandidate`, o levantamento normal implícito e snapshots analíticos
como cache reconstruível. Todo recurso relacionado a vídeo permanece fora do escopo da V3.

O detalhamento está em `SCOUT_TRAINER_EVOLUTION_V3_ANALYTICS.md` e no plano
`../../docs/SCOUT_TRAINER_V0.3_PLANO_IMPLEMENTACAO.md`.

## Evoluções pós-V2

| Entrega                                      | Situação  |
| -------------------------------------------- | --------- |
| Exportação para pasta e portabilidade local  | Concluída |
| Área Livre persistente para registros gerais | Concluída |
