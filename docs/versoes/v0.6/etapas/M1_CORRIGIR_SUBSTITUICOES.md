# M1 — corrigir substituições existentes

**Objetivo:** fazer a substituição funcionar no fluxo atual antes de introduzir o futsal. **Depende de:** M0. **Próxima:** M2.

**Estado desta rodada:** fluxo de futebol implementado. O relato do vôlei permanece sem reprodução em UI; a inspeção estática não justificou alterar a regra de rotação.

## Diagnóstico já observado

O registro principal de futebol monta `FootballMinimalScoutScreen.tsx`, cujo `quickActions` não contém `substitution`. `FootballActionPanel.tsx` lista “Substituição”, mas não é montado nessa tela. `RegisterFootballEventInput.relatedPlayerId` e `createCanonicalFootballEvent()` já permitem representar o atleta que entra. O método `ScoutTrainerService.substitute()` e `CourtLineup.tsx` são o caminho do vôlei; sua semântica de slot/rotação não serve a futebol ou futsal.

## Implementação

1. Adicionar entrada clara **Substituição** ao registro de futebol, sem pedir marcação no campo ou controle da bola. Selecionar equipe, **sai** e **entra** entre atletas da mesma partida. Mostrar camisa e nome, permitir localizar atletas com elenco grande, confirmar a troca e dar feedback de gravação/erro.
2. Usar `registerFootballEvent` ou caso de uso pequeno e específico, com `playerId` como atleta que sai e `relatedPlayerId` como atleta que entra. Validar IDs distintos, equipe comum, ordem de uso e duplicidade. Se a composição em campo não for conhecida, registrar a troca como observada com cobertura parcial, sem afirmar titulares anteriores.
3. Projetar uma lista de atletas em campo **somente quando houver estado observado suficiente**. Se houver entrada/saída conhecida, atualizar esse estado; não filtrar o elenco por `Player.active`, que significa cadastro ativo e não presença em campo. Deixar a posse, relógio e placar intactos.
4. Garantir correção/desfazer e recarga do evento sem duplicação. Backups antigos devem abrir sem exigir campos novos. Conferir a exportação de futebol para que jogador que sai e reposição mantenham a semântica já contratada.
5. Reproduzir em UI a queixa de substituição no vôlei com banco disponível e escalação válida. Se falhar, corrigir causa observada em `CourtLineup.tsx`/serviço e manter rotação, líbero e estado tático coerentes. Se não reproduzir, registrar evidência e cenário testado; não reescrever o motor do vôlei por hipótese.

### Feito nesta rodada

- O botão **Substituição** foi incluído na tela de futebol realmente usada no registro.
- O formulário coleta equipe, atleta que sai e atleta que entra, preservando os IDs mesmo com nomes iguais. Os seletores nativos aceitam busca por digitação e exibem camisa/nome.
- A gravação envia saída em `playerId` e entrada em `relatedPlayerId`, com o tempo corrente e o controle da bola preservado. Há retorno de sucesso/erro e bloqueio de envio duplicado enquanto salva.
- `registerFootballEvent` e `correctFootballEvent` rejeitam substituição sem os dois atletas ou com o mesmo atleta nos dois lados; a validação existente exige que ambos pertençam à equipe informada.
- A composição em campo não é projetada, porque o fluxo atual não observa a escalação inicial. Nenhum estado de titular/reserva é inferido a partir de `Player.active`.
- O caminho do vôlei foi lido estaticamente, mas não reproduzido numa sessão visual. Essa parte permanece pendente e não houve mudança em slot/rotação.

## Aceite e verificação

- Futebol: troca A e B; atletas homônimos com IDs diferentes; camisa local; erro de equipe/mesmo atleta; sem elenco; troca durante relógio rodando; reload; correção/desfazer; backup round-trip.
- Vôlei: troca válida em cada equipe, retorno de atleta, banco vazio, dupla escolha, replay/rotação e mensagem de erro visível. Teste E2E para o problema de UI, além dos testes de serviço existentes.
- Verificação pendente: `npm run typecheck`, lint dirigido e inspeção desktop/celular. Não foram executados testes/typecheck nesta rodada.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M1. Implemente somente M1.
Feche o fluxo de substituição do futebol na tela real em uso. Reproduza
e verifique o fluxo de vôlei; corrija-o se houver falha comprovada.
Não use o método de rotação do vôlei para futebol. Preserve dados e
alterações preexistentes. Relate evidências, arquivos e testes; não
inicie M2.
```
