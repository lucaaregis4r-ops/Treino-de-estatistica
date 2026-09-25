# A2 — Pressão fixável, opcional e localizada

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / R4 ampliada. **Estado:** planejada. **Dependência:** A1. **Objetivo:** permitir registrar pressão em um toque quando o scouter optar por acompanhá-la.

## Ler e inspecionar

[README](README.md), [A1](A1_CONTRATO_E_ARQUITETURA.md), [R4](../etapas/reformulacao-futebol/R4_DETALHES_OPCIONAIS.md), `src/ui/screens/scout/football/FootballScoutScreen.tsx`, estilos associados, serviço e tipos de pressão existentes. A prévia aprovada serve de referência para a composição mínima.

## Interação

Em Detalhes → Pressão, oferecer **Registrar pressão**. Desativado por padrão. Ativar fixa uma linha compacta no fluxo da tela, próxima aos comandos e fora do campo. Fixar significa manter visível; não usar uma sobreposição que cubra o jogo. Não abrir janela de configuração.

Linha: **Branco pressiona · Alta · Média · Baixa · Sem pressão · Não observada · Ocultar**. A equipe indicada é quem pressiona, adversária de quem controla a bola. O operador não precisa escolhê-la novamente.

- Um toque registra a observação e mantém os botões. Não exigir confirmação nem outro clique no campo.
- Alta/Média/Baixa significam **altura da pressão**, em relação ao campo da equipe que pressiona: adiantada, intermediária ou recuada. Não significam forte/fraca nem número de jogadores. Individual/Coletiva continuam disponíveis no detalhe eventual, como dimensão separada, sem outra linha fixa.
- Sem pressão é ausência observada; Não observada é desconhecido. A explicação dos termos pertence à ajuda curta, sem texto didático permanente na coleta.
- Cada toque é uma observação pontual. Botões não permanecem selecionados como um estado que se replica; feedback breve informa “Alta registrada”. O último valor, se mostrado, deve dizer “Última observação” e hora, nunca parecer uma resposta atual automática.
- Trocar posse atualiza a equipe indicada e limpa qualquer realce transitório. Disputa, parada, pausa, intervalo e controle desconhecido desabilitam a anotação. Retomada exige controle observado; nenhum preenchimento automático da lacuna.
- Ocultar remove a linha e preserva registros. Preferência pode ser lembrada por operador/partida, sem criar episódio de pressão ao restaurar.

## Onde a equipe pressiona

Separar **classificação do scouter** de **posição observada da bola sob pressão**. Um botão Alta não gera coordenadas. Um ponto no terço ofensivo também não classifica automaticamente pressão alta.

No toque de pressão, capturar instante, controle e último ponto elegível. Proposta inicial de elegibilidade: mesma posse/período/equipe com bola, sem lacuna, ponto de no máximo 3 segundos. Esse limite é uma hipótese de interação a verificar no piloto, não uma medida validada da dinâmica do jogo. Guardar ID/tempo do ponto e diferença de tempo; a posição continua aproximada, sem interpolação.

Se a posição estiver velha ou ausente, salvar pressão **sem posição** e permitir correção posterior. Nunca pedir um clique espacial extra obrigatório ou descartar a anotação. O rótulo de última posição deve continuar explícito.

Guardar orientação por equipe/período. Para comparar zonas, normalizar em relação à equipe que pressiona; mudança de lado não deve inverter conclusões. Orientação desconhecida impede análise direcional, não o registro.

M8 poderá mostrar distribuição das **observações de pressão com posição**, por equipe/zona, e cobertura: total anotado, com posição elegível e desconhecidos. Não chamar isso de tempo pressionando nem taxa de pressão por zona: a coleta é esparsa e facultativa. Informar que a posição é da bola, não o mapa dos defensores. Ausência de anotação nunca vira ausência de pressão.

## Composição e aceite

Manter resultado de chute na faixa contextual prioritária; a linha de pressão não o substitui. Desabilitar pressão enquanto o operador escolhe origem/resultado ativo de chute, podendo adiar o resultado e retomar coleta. Nenhum novo painel lateral. Campo não muda de posição durante gesto ou troca; ativar/desativar é ação explícita entre gestos. Em móvel, quebrar botões em linhas sem cobrir o campo ou criar rolagem interna.

Testar ligado/desligado, cliques repetidos intencionais, troca de equipe, pressão sem ponto, ponto antigo, pausa, período com lados invertidos, desfazer, falha e recarga. Coleta básica deve manter contagem de interações quando a opção está desligada; ligada, cada pressão requer um toque. Incorporar saída/estrutura, roubada e jogador da R4 pelo único acesso Detalhes, sem fixá-los automaticamente. Typecheck e testes pertinentes.

## Prompt para o Luna

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md e registro-assistido/README.md
e registro-assistido/A2_PRESSAO_FIXAVEL.md dentro desse pacote, além da R4.
Execute somente A2 após A1. Implemente a pressão fixável por opção do scouter;
reutilize Detalhes para os demais itens da R4. Separe altura, forma e posição.
Não herde pressão para observações futuras. Atualize ESTADO.md e pare antes de A3.
```
