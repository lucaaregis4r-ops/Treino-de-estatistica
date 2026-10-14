# S2 — trajetórias completas observadas

**Data:** 01/10/2026. **Próxima etapa:** [S3 — análises e apresentação](etapas/S3_ANALISES_DESCRITIVAS.md). A versão distribuída continua em 0.5.0 enquanto M8 não for concluída.

## Contrato entregue

`ObservedSequence` é uma projeção derivada com `unitId`, modalidade, partida, set/período, equipe da posse quando aplicável, todos os passos observados em ordem, IDs de fonte e da revisão efetiva, início, fim, desfecho, cobertura e motivos de censura. Nenhum limite de dois ou três passos entra no armazenamento ou na projeção. `selectObservedSequences` escolhe **unidades inteiras** por equipe, contexto, resultado, cobertura ou ação; não remove passos intermediários. `countObservedUnits` deduplica IDs de rally no agregado global.

- **Vôlei:** `RallyPathAnalyzer` fornece todos os contatos efetivos de cada `rallyId`, incluindo os dois lados, vencedor e terminal quando observados. Rally sem terminal fica censurado; vencedores conflitantes, ordem ou set inválidos ficam em conflito. Correção e desfazer recompõem a unidade preservando o ID do contato de origem.
- **Futebol:** o adaptador parte dos segmentos de `projectControl`, separa uma disputa ou suspensão mesmo se o segmento legado os mantiver juntos e encerra no controle adversário, gol, bola parada, reinício ou período. Chute defendido com continuidade observada mantém a posse; um rebote não é inventado. Eventos antigos com `possession` do provedor viram trilhas censuradas, sem fingir início observado.
- **Futsal:** fatos efetivos após correção/desfazer formam posses por controle, desarme e gol. Finalizações defendidas mantêm a trilha; gol a encerra. Substituição e comandos T entram como contexto na ordem registrada; passes não coletados não são criados. Fatos fora de posse observada ficam em `unassigned`, sem serem colados a uma posse vizinha.

As unidades são expostas em `MatchWorkspace.observedSequences`. O ID deriva da partida, contexto e primeiro fato efetivo; ele não é persistido. Se uma correção alterar o limite, a projeção recompõe os IDs e mantém os IDs das evidências. O relatório derivado do vôlei passou a contar `rallyId` distinto no `sample.n` global, com versão de método `scout-trainer-0.6-s2`.

## Verificação

- Testes dirigidos cobrem rallys de 1, 8 e 20 contatos, dois prefixos iguais com terminais diferentes, repetição, rally aberto/conflitante, correção/desfazer, duas finalizações na mesma posse de futebol, transferência A→B, lacuna, reinício, virada de período, legado sem extensão, futsal com gol/defesa/troca/T, tempo ajustado, erro temporal e posse sem início.
- Integração do serviço compara as unidades antes/depois de reabrir a partida e de importar backup JSON 1.3 no futebol e no futsal. Não foi adicionada migração nem campo persistido.
- TypeScript, ESLint dirigido e `git diff --check` executados nesta rodada.

## Limites

- S2 não muda a interface nem os estimadores atuais de Markov. S3 apresentará as unidades, censuras e denominadores; S4 tratará o modelo probabilístico de contexto variável.
- Unidades com início ou fim ausente, suspensão, conflito ou corte de período são visíveis, mas `eligibleForOutcome` é falso. Eventos legados sem equipe/controlador confiável permanecem não atribuídos.
