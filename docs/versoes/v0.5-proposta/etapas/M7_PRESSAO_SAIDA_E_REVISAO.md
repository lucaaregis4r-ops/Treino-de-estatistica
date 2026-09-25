# M7 — Pressão, saída e detalhes na revisão

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M6 aprovada operacionalmente.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M7; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

**Revisão de direção em 21/09/2026:** etapa adiada até M5 reformulada e M6. Adicionar contexto em uma composição de Revisão, fora da coleta ao vivo. R4 permite anotações rápidas, opcionais e transitórias na faixa existente; esta M7 cuida da revisão mais extensa. Não recolocar o antigo painel como acordeões ou gavetas permanentes.

## Leitura de código

`src/domain/football/FootballPressureEpisode.ts`, `FootballPressureAnalytics.ts`, `src/ui/screens/scout/football/FootballContextDrawer.tsx`, `FootballTacticalQuestion.tsx`, histórico do registro e contratos de M4.

## Regras e interface

- Na revisão, pressão não observada/livre/sob pressão; individual/coletiva opcionais. Vincular snapshot ou episódio aos momentos efetivamente observados; revisão tardia não autoriza inventar contexto nem tratar recordação como registro feito ao vivo.
- Episódio tem começo/fim/cobertura; não herdar para equipe oposta. Encerrar ou censurar ao parar, mudar período ou perder observação. Superação da pressão é observada, não deduzida de avanço em x.
- Separar tipo de saída curta/direta/mista/desconhecida de estrutura 3+1/3+2/outra. Valer para trecho de construção; recuperação alta/transição não recebe saída desde trás automaticamente.
- Detalhes de perda: passe interceptado/fora, desarme, domínio, outra/não observada; distinguir ação, jogador envolvido e controle resultante. Desfecho parada não é necessariamente perda para adversário.
- Autor/portador opcional por registro, sem herança silenciosa. Detalhar chute posteriormente (parte do corpo, de primeira, origem em jogo corrido/bola parada, alvo quando visto) sem exigir tudo ao vivo.
- Revisão ligada a ID/tempo, aberta explicitamente fora da composição de coleta e sem alteração do relógio do jogo. Retorno preserva estado de captura; eventual lacuna é registrada. Editar lance antigo não muda contexto corrente; correção reprojeta análises dependentes.

## Aceite e verificação

Coletar várias posses sem mostrar os campos de contexto; completar saída/pressão na revisão; trocar equipe sem herdar pressão/autor; contexto desconhecido permanece distinto de livre; corrigir evento antigo sem afetar a nova captura. Repetir o trecho operacional necessário para conferir se contexto acrescentou atraso. Testes focados, typecheck e evidência de uso; não implementar rankings ou causas automáticas.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M7_PRESSAO_SAIDA_E_REVISAO.md.
Execute somente M7, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
