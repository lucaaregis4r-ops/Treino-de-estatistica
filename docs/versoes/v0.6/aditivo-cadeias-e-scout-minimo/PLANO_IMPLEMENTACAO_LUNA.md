# Plano de implementação para o Luna

## Problema observado no código

- Vôlei: `RallyPathAnalyzer.ts` já reúne contatos por `rallyId`, mas o foco exibido é um sufixo e `buildRallyPathFlow` usa horizonte 1 ou 2. `SequencePatternAnalyzer.ts` limita padrões a 2 ou 3 estados. A matriz absorvente de primeira ordem utiliza transições de rallies inteiros para estimação, porém seu estado não guarda a história do ponto.
- Futebol: `FootballObservation.ts` segmenta controle em posses; `FootballMarkovAnalyzer.ts` agrega pares adjacentes. Um filtro de eventos aplicado antes da segmentação pode criar uma cadeia artificial. Os *cohorts* já usam posses inteiras para algumas perguntas.
- Futsal: `FutsalScout.ts` guarda fatos ordenados e `FutsalAnalytics.ts` reconhece episódios fechados para contagens, mas não oferece uma trajetória de posse inteira para consulta. O gol hoje não encerra automaticamente o último controle projetado; a regra de fim da posse precisa ser explícita.
- Interface: `FutsalScoutScreen.tsx` coloca substituições, revisão, relógio e formulários antes da quadra. O fluxo em `football/FootballMinimalScoutScreen.tsx` mostra placar/tempo, campo, controle e ações no mesmo espaço de trabalho.

## Princípio estatístico

Uma **trajetória registrada completa** é a unidade primária: início, todas as ações observadas em ordem, fim e resultado, sem limite de comprimento. “Completa” significa que os limites e a cobertura do registro são conhecidos; nunca significa que ações não registradas foram observadas. Exibir a trilha e suas variantes, contagens e desfechos antes de qualquer probabilidade.

Uma cadeia de Markov sobre apenas a ação atual perde a ordem anterior, ainda que suas transições sejam estimadas com todos os eventos. Um estado que inclui o prefixo inteiro preserva a história, mas multiplica estados raros. S4 avalia esse modelo separadamente; amostra insuficiente retorna **indisponível**, mantendo a análise descritiva S3 acessível. Não chamar o diagrama de pares ou uma subsequência frequente de “cadeia inteira”.

## Contrato comum proposto

`ObservedSequence` será **projeção calculada**, sem migração de eventos brutos como passo inicial: `unitId`, `sport`, `matchId`, `teamId` de perspectiva, `periodOrSet`, `orderedObservations[]` (`sourceEventId`, ordem, tipo, equipe, instante/posição quando observados), `startReason`, `endReason`, `outcome`, `coverage` (`complete | left_censored | right_censored | gap | conflicting`) e `provenance` por fronteira. IDs devem ser estáveis sob recarga; correção/desfazer reprojetam a trilha. A versão do codificador de ações fica explícita para que variantes antigas continuem reproduzíveis.

| Esporte | Unidade | Fim conhecido | Lacuna que impede taxa por desfecho |
|---|---|---|---|
| Vôlei | Rally inteiro, ambos os lados até o ponto | Ponto confirmado ou encerramento explícito | Rally sem início/fim ou contatos conflitantes |
| Futebol | Uma posse com controle observado | Perda, interrupção, gol ou fim de período conforme evento/regras | Controle suspenso, início desconhecido ou posse aberta |
| Futsal | Uma posse com controle observado e tempo efetivo | Mudança observada, parada, gol confirmado ou fim de período | Lacuna de cobertura ou fim não observado |

O controle direto A→B registrado pelo operador é uma **mudança observada** e deve poder encerrar uma posse e abrir outra sem inserir disputa fictícia. A S0 removeu a exigência de estado intermediário, adicionou desarme com troca automática de posse e preservou correção/desfazer pelo histórico de fatos. Quando o operador não viu quem controlou a bola, usa “disputa”, “parada” ou “não observado”. S2 explicitará o encerramento de posse por gol como **regra derivada**, com proveniência distinta de observação humana; defesa/bloqueio não encerram posse automaticamente. T controla apenas relógio, nunca posse.

## Produto e análise

1. O detalhe de cada unidade mostra **início → todos os eventos → desfecho**, inclusive 1, 7 ou 30 ações. A UI pode recolher visualmente trechos longos, mas o dado, cálculo e exportação não os truncam.
2. Métricas por unidade: total e distribuição de ações observadas, resultado, duração somente com horários confiáveis, progressão espacial somente entre pontos conhecidos, localização ausente visível. Rallies/posses censurados aparecem à parte.
3. Variantes exatas e variantes com vocabulário tático pequeno, com `n`, denominador por **rally único** ou **posse única**, resultado e IDs de evidência. Exibir filtros por equipe, set/período, desfecho e comprimento sem reconstruir cadeias a partir de eventos filtrados. Padrões contíguos de comprimento variável são complemento, com suporte e limites de desempenho; não substituem a trilha inteira.
4. O Markov de pares atual fica identificado como **resumo de transições**. S4 pode estimar estados de prefixo e aplicar recuo de contexto com suporte mínimo e validação fora da partida. Não usar probabilidades de trajetórias únicas como recomendação tática.
5. Futsal: topo compacto com placar, período, 20:00 regressivo/T e faltas; quadra específica visível; escolha A/B/disputa/parada/desconhecido; toque padrão grava marco de bola com posição, tempo efetivo e controle observado; faixa inferior com Finalização, Falta, Reinício, Substituição, Goleiro-linha, Desfazer e Mais. “Mais” permite marcar passe e condução **explicitamente observados**, se o contrato S0 confirmar o vocabulário, sem inferi-los dos toques de posição. Menus contextuais só pedem o detalhe necessário. Composição, orientação, ajuste justificado e revisão tática ficam acessíveis em “Mais”/tela secundária.

## Ordem e dependências

`S0 → S1 → S2 → S3 → S4 → S5`. S4 não bloqueia o uso de S3 quando o dataset não sustenta estimativas; seu aceite é mostrar resultado validado **ou** indisponibilidade explicada. S5 não declara piloto humano feito por automação. Preservar M0–M8 e alterações locais existentes.

## Fora deste aditivo

Não gerar passes ou trajetórias não observadas a partir de toques esparsos; não atribuir causa a uma sequência associada a gol/ponto; não aplicar xG de futebol ao futsal. Modelos de assinatura de caminhos e semi-Markov temporal podem ser reavaliados após coleta suficiente e verificação da qualidade dos timestamps, sem entrar no núcleo deste plano.
