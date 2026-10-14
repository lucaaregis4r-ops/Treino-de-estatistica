# M4 — scout essencial do futsal

**Objetivo:** permitir registrar uma partida completa com um operador. **Depende de:** M2–M3. **Próxima:** M5.

**Estado desta rodada:** ações essenciais implementadas na tela de futsal; fatos persistidos, projetados e incluídos no backup 1.3.

## Interface mínima

Cabeçalho: equipes, placar, `período · tempo`, botão T, faltas do período. Área central: quadra de futsal tocável. Faixa de ações: equipe A/B controla, disputa, parada, desconhecido, finalização, reinício, falta e desfazer. Tática e atleta ficam opcionais; não exigem cliques no fluxo normal.

## Regras de registro

1. Reusar o princípio de controle/marco observado do futebol por posse. Um toque registra posição atual, não passe nem condução. Troca de equipe exige controle adversário observado; bola disputada e parada permanecem distintas.
2. Finalização registra equipe, período/tempo, origem opcional, jogador opcional e resultado: gol, defesa, bloqueio, fora, trave ou pendente. Rebote não encerra posse automaticamente; gol confirmado altera placar uma vez. Gol contra guarda equipe beneficiada explícita.
3. Parada e reinício guardam tipo quando conhecido: lateral, escanteio, arremesso de meta, tiro livre, tiro de 10 m, pênalti, saída ou outro. O nome exibido é de futsal; não usar `throw_in`/`goal_kick` de futebol como rótulo de interface.
4. Falta acumulada é ação observada com equipe infratora; posição e atleta opcionais. Contador por equipe/período, aviso na quinta e a partir da sexta. O app não decide se ocorreu falta, não marca tiro de 10 m sozinho e não altera placar por falta. Corrigir/remover recompõe o contador.
5. Desfazer/corrigir preserva ID, ordenação, relógio e estado de controle; erros de gravação não descartam rascunho. Cobertura suspensa e trecho não observado não contam como tempo de posse conhecido.

## Aceite e verificação

Fixtures: posse com dois chutes/rebote, chute sem origem, gol/contra, troca observada, disputa, parada/reinício, falta 5/6, período novo, correção e reload. E2E de partida curta em desktop e celular com T operando independentemente da coleta. Backup round-trip, typecheck/lint e regressão futebol/vôlei.

**Implementado:** eventos próprios de registro/correção/desfazer; controle observado e marcos de disputa/parada/desconhecido; finalizações com resultado e beneficiário explícito; reinícios com vocabulário de futsal; faltas acumuladas por equipe/período, alertas a partir da quinta e edição/desfazer; quadra registra posição normalizada e tempo no início do toque. Placar e faltas são projetados do histórico, sem mutação duplicada.

**Verificado:** testes dirigidos para rebote/dois chutes, correção e desfazer de gol/faltas, round-trip de backup; `npm run typecheck`, lint dos arquivos alterados e `git diff --check`. E2E em desktop e viewport móvel (390 px) passou: T, controle, gol, segundo chute, sexta falta, aviso e desfazer.

**Pendente para M8:** regressão completa de futebol/vôlei, piloto real e inspeção visual manual em aparelho móvel.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M4. Implemente somente o scout
essencial descrito aqui. Preserve a separação entre tempo, controle e
posição observada. Faça uma partida de fixture com dois chutes, parada,
troca de controle, gol e sexta falta. Relate evidências; não inicie M5.
```
