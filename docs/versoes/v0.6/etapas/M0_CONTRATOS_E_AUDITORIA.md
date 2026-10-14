# M0 — contratos e auditoria

**Objetivo:** fechar o desenho da 0.6 antes de alterar fluxos de partida. **Estado:** concluída por auditoria documental em 30/09/2026; contratos em [`CONTRATOS_M0.md`](../CONTRATOS_M0.md). **Depende de:** nada. **Próxima:** M1.

## Entradas reais

`src/domain/match/entities/{MatchSport,MatchMetadata,Player}.ts`; `src/domain/match/events/MatchEvent.ts`; `src/domain/football/{FootballObservation,FootballRecorder,StatsBombContract,FootballModels}.ts`; `src/application/ScoutTrainerService.ts`; `src/infrastructure/export/json/MatchJson.ts`; `src/ui/screens/scout/{CourtLineup,football/FootballMinimalScoutScreen}.tsx`; `reference/football-models/xg.json`.

## Entrega

1. Documentar mapa de fluxo atual de substituição: botão/seletores → validação → evento → projeção → recarga → backup, separando futebol e vôlei. Reproduzir a falha relatada quando houver caminho visível; registrar o que foi observado, sem inventar causa para o vôlei.
2. Definir `MatchSport='futsal'` explícito, regras de compatibilidade e discriminação de eventos no backup. Partidas sem `sport` continuam no caminho legado; não reinterpretar eventos de futebol como futsal.
3. Fechar tipos de relógio de tempo efetivo, duração por período, ajuste auditável, limite 20:00, recuperação após fechamento e cálculo do minuto acumulado do segundo período. Decidir como representar exceção de cobrança após o zero.
4. Definir evento de futsal com ID, sequência, equipe, período, tempo, ação/resultado, coordenada normalizada opcional, nível de observação e ligação de correção/desfazer. Separar organização da posse e situação de goleiro-linha.
5. Definir invariantes de substituição: jogador que sai/entra da mesma equipe; IDs distintos; entrada não pode estar em quadra quando a composição é conhecida; no futsal, composição desconhecida não será inventada. Registro não altera posse/tempo/placar.
6. Preparar fixtures calculáveis à mão: partida antiga, um período com pausa, segundo período, gol contra, rebote, sexta falta, troca de futebol, troca de vôlei e troca volante de futsal. Declarar a política de xG da [referência](../REFERENCIAS_E_DECISOES.md#xg-no-futsal).

## Aceite

- Documento de contrato curto e verificável, com campos, exemplos JSON/TypeScript e migração ou leitura compatível definidos.
- Cada decisão aponta o arquivo que a implementará; nenhum código de jogo é alterado nesta etapa.
- `git status` e pendências preexistentes registrados. Sem alegação de teste funcional se a etapa só fez leitura.

## Prompt para o Luna

```text
Leia ` AGENTS.md`, docs/versoes/v0.6/README.md,
docs/versoes/v0.6/PLANO_IMPLEMENTACAO_LUNA.md,
docs/versoes/v0.6/REFERENCIAS_E_DECISOES.md e este M0.
Execute somente M0. Faça a auditoria concreta dos caminhos indicados,
registre contratos, invariantes e fixtures. Não implemente M1.
Relate evidências verificadas, arquivos alterados, testes executados
(se houver) e pendências.
```
