# S2 — projeção de rallys e posses completos

**Estado:** implementada em 01/10/2026. [Resultado e verificações](../S2_RESULTADO.md). Próxima: S3.

**Objetivo:** produzir uma lista ordenada e auditável de todas as ações registradas dentro de cada unidade, sem janela fixa. **Depende de:** S0/S1; a projeção do vôlei/futebol pode começar em paralelo técnico sem ativar a tela antes do contrato de futsal.

1. Implementar um contrato analítico comum `ObservedSequence` e três adaptadores puros. Vôlei: `rallyId`, ambos os lados, todos os contatos e terminal confirmado; reaproveitar `RallyPathAnalyzer`. Futebol: partir dos segmentos observados de `projectControl`, com fim por perda/parada/gol/período e fonte canônica em `football.events`. Futsal: partir dos fatos efetivos após correção/desfazer, controle/tempo efetivo/resultado e fronteiras S0. Nunca usar `Player.active` como posse/escalação.
2. Preservar ordem, IDs de origem e contexto de set/período; incluir começo/fim/resultado e razões de censura. Ao aplicar filtro por equipe, período ou resultado, selecionar **unidades inteiras primeiro** e só então calcular; um filtro de tipo de ação não pode juntar dois fragmentos nem remover passos intermediários da evidência.
3. Usar IDs estáveis derivados da fonte e fronteira inicial; se uma correção mudar fronteira, criar nova projeção consistente e manter vínculos de evidência. Backups antigos devem carregar e projetar com as mesmas regras; não exigir migração de schema nesta etapa.
4. Cobertura: distinguir `complete`, início ausente, fim ausente, lacuna/suspensão e conflito. Todos são visíveis como trilhas observadas; apenas unidades elegíveis entram nos denominadores de desfecho. Futsal registra os fatos disponíveis, sem inferir passes não coletados.

**Fixtures obrigatórias:** rally de 1/8/20 contatos; dois rallys com mesmo prefixo e finais distintos; sequência longa com repetição/loop; futebol com dois chutes e rebote na mesma posse; A→B observado; posse com lacuna, reinício e virada de período; futsal com gol, defesa, substituição e tempo T; correção/undo que remonta os limites. Testar reabertura e `unitId`/ordem da evidência.

**Aceite:** nenhum limite 2/3 ou `horizon` no armazenamento/projeção; a unidade de 20 ações contém as 20 ações e terminal em ordem; `n` global de vôlei conta `rallyId` único, com perspectiva de equipe explicitada. Testes de integração e contrato de backup dirigidos aprovados.

**Prompt para o Luna:** “Execute apenas S2. Implemente projeções puras de trajetórias registradas completas nos três esportes e cubra as fixtures. Não altere análises de UI nem estimadores nesta etapa; reporte unidades censuradas e IDs de evidência.”
