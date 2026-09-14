# Macroetapa 2 — Motor de partida derivado de eventos

Concluída em 25 de agosto de 2026.

## Resultado

O estado da partida continua sendo reconstruído a partir do histórico, agora com geração e replay explicitamente separados:

```text
ScoutEvent
  -> RallyOutcomeResolver
  -> MatchEventFactory
  -> MatchEvent[]
  -> MatchReplayService
  -> MatchReducer
  -> MatchState
```

## Alterações principais

- `MatchEventFactory` passou a criar início/resultado de rally, fim de set, correção de scout, correção manual de ponto, undo e redo.
- `MatchReplayService` passou a ser o ponto canônico de reconstrução do estado.
- Eventos derivados de um scout são posicionados no instante lógico do contato original, mesmo quando criados por uma correção posterior.
- O reducer deriva placar, saque e rotação do histórico efetivo e do estado reconstruído naquele instante.
- `match_correction` representa `Corrigir +1` sem alterar o placar diretamente.
- Correções manuais de ponto podem ser desfeitas e refeitas por replay.
- O início de rally criado para um scout é removido quando o registro é desfeito, mas permanece quando apenas uma correção desse scout é desfeita.
- Erros explícitos de saque, recepção, levantamento, ataque, bloqueio, defesa ou free ball encerram o rally com ponto do adversário.
- `ScoutEventHistory`, que duplicava o histórico canônico, foi removido. O caminho único é `MatchEvent` + `ScoutTimeline`.
- O importador JSON reconhece e valida `match_correction`.

## Compatibilidade

- Eventos legados (`score_changed`, `serving_team_changed` e `rally_ended`) continuam aceitos no replay e na importação.
- O schema JSON permanece `1.0.0`; a nova variante de evento é aditiva para esta versão da aplicação.
- Nenhuma regra de lineup avançado, inversão do 5x1, workspace ou PDF foi antecipada.

## Invariantes cobertos

- o mesmo log produz o mesmo estado, independentemente da ordem retornada pelo armazenamento;
- undo de scout remove seus eventos derivados;
- undo + redo restaura placar, saque, sets e rally;
- correção retroativa é aplicada na posição original do rally;
- eventos persistidos possuem IDs e sequências únicos;
- correção manual não escreve placar diretamente;
- fim de set e fim de partida são reproduzíveis pelo replay.

## Verificação

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 42 arquivos e 240 testes aprovados.
- `npm run test:e2e`: 7 cenários aprovados.
- `npm run build`: aprovado, com 124 módulos transformados.
