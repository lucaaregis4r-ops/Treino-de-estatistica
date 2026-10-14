# S0 — contratos para trajetórias completas

## Inventário do código em 0.6

| Área | O que já existe | Lacuna para S2–S4 |
|---|---|---|
| Vôlei | `RallyPathAnalyzer` agrupa contatos por `rallyId`, preserva a trilha e distingue rally elegível/incompleto/excluído. | O fluxo visual tem horizonte 1 ou 2; `SequencePatternAnalyzer` limita padrões a 2 ou 3 estados. |
| Futebol | `FootballObservation.projectControl` forma segmentos com eventos e marcos, período e cobertura; `FootballMarkovAnalyzer` usa esses segmentos. | A matriz agrega apenas pares adjacentes; não apresenta a posse inteira como unidade principal. |
| Futsal | `FutsalScout` reconstitui fatos, correções e desfazer; `FutsalAnalytics` conta episódios fechados por marcos de controle. | Falta projeção explícita de posse com todos os fatos ordenados. Desarme agora fecha A e abre B sem marco fictício. |
| Relatório | `DerivedAnalyticsReport` recebe análises de vôlei por equipe. | `sample.n` soma sequências das perspectivas das duas equipes: pode duplicar rallies no global. S3 deve deduplicar por `rallyId`. |

## Unidade observada

- **Rally de vôlei:** começa no primeiro contato registrado sob um `rallyId`; contém todos os contatos desse ID, em ordem de captura, sem limite de comprimento. Fecha com ponto cujo vencedor é conhecido. Sem vencedor ou com ordem inválida, permanece incompleto/excluído conforme o motivo; não entra no denominador de vitória. Troca de set encerra a unidade, sem costurar rallies.
- **Posse de futebol:** começa quando há controle de equipe observado ou reinício atribuído; inclui todos os eventos e marcos associados até troca de controle, gol, bola parada, suspensão ou fim do período. Uma troca A→B observada fecha A e abre B no mesmo evento; um desarme ganho registra defensor B e a posse muda para B. Chute defendido pode manter a posse se houver continuidade observada; rebote não é recuperação presumida. Gol fecha a posse e deixa bola parada. Posse aberta no fim do registro é censurada.
- **Posse de futsal:** começa com `control` de equipe, reinício com controle confirmado ou `tackle` ganho; o desarme de B sobre A usa um ponto, fecha A e abre B. A troca A→B por botão também é observação explícita e dispensa disputa fictícia. A posse fecha em outro controle, parada, lacuna ou mudança de período. Finalização tem origem e destino quando observados; chute isolado não prova que a posse terminou. Gol é desfecho de placar; S2 deve fechar a posse no gol e exigir novo controle após a saída, preservando registros legados que não trazem esse marco.
- **Cobertura:** tempo e desfechos são classificados como observados, parciais ou não observados. Sequência de cliques não prova observação contínua. Lacuna, início desconhecido, fim aberto e correção que altera o limite geram unidade censurada/recalculada, jamais ação inventada.

## Identidade e cálculo

`ObservedSequence` será **projeção derivada** de fatos efetivos, sem novo ID persistido no backup nesta etapa. Chave proposta: modalidade + partida + período/set + primeira ocorrência efetiva + perspectiva; manter IDs de origem para auditoria. Correção e desfazer refazem os limites e invalidam chaves derivadas afetadas. Para o agregado global, deduplicar rallies por `rallyId`; para recorte por equipe, contar cada unidade uma vez por perspectiva. Posse pertence a uma equipe por episódio, inclusive se o evento de troca tiver ação do adversário.

S2 exportará trilha completa e estado de cobertura. S3 mostrará contagem, `n`, unidade, desfechos, censuras e filtros. S4 poderá testar estados de prefixo e recuo variável; probabilidade de transição local não será apresentada como probabilidade da posse/rally inteiro. Subsequências recorrentes contam apoio por unidades distintas, além de ocorrências.

## Contrato espacial e operacional aprovado para esta etapa

| Ação | Captura | Controle após salvar | Atalho |
|---|---|---|---|
| Posição da bola/controle | Um ponto ou sem localização declarada | Equipe escolhida | 1/2 |
| Finalização | Origem e destino; exceção explícita sem trajetória | Conforme desfecho observado | F |
| Desarme ganho | Um ponto; nenhum destino | Equipe que desarmou | Futebol T; futsal D |
| Reinício/falta no futsal | Um ponto ou sem localização declarada | Sem inferir troca | R/V |
| Relógio do futsal | Sem ponto | Sem efeito na posse | T |

A quadra/campo usa como referência visual a orientação da equipe A **no período corrente**. A posse e a equipe da ação não alteram o lado da representação. Coordenadas salvas continuam canônicas; apenas uma mudança de período ou ajuste explícito da orientação pode virar o desenho.

## Decisões pendentes para S1/S2

- Passes e conduções no futsal precisam de fatos próprios e versão de backup antes de entrarem nas análises; marco espacial isolado não vira passe.
- Definir com operadores se o painel de resultado da finalização deve abrir imediatamente após o segundo ponto e qual posição dos controles funciona melhor em 390 × 844.
- Tratar gol contra, falta, rebote e cobertura suspensa em fixtures da projeção completa antes de estimar taxas.

Base metodológica: [REFERENCIAS_E_DECISOES.md](REFERENCIAS_E_DECISOES.md).
