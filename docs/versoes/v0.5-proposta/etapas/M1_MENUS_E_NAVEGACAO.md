# M1 — Menus e navegação nas duas modalidades

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M0.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M1; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Diminuir a quantidade de escolhas concorrentes e deixar clara a sequência criar/retomar partida → registrar → analisar.

## Leitura de código

`src/ui/app/App.tsx`, `src/ui/app/app.css`, telas atuais de início/partidas, `src/ui/screens/registrations/RegistrationsScreen.tsx`; `src/ui/app/App.test.tsx` e `AppFlow.test.tsx`.

## Composição proposta

- Menu global: **Início · Partidas · Equipes e atletas · Treino · Ajuda**. Reaproveitar telas existentes; Manual fica em Ajuda, perfis em área secundária identificada de configurações, sem perder acesso.
- Início: ação principal Nova partida, retomada da partida em andamento e partidas recentes. Partidas: filtro por modalidade e estado, busca e retorno preservando filtros.
- Equipes e atletas: abrir em Equipes, com edição de elenco na própria equipe; Atletas permanece acessível como cadastro reutilizável.
- Dentro da partida: cabeçalho compacto com modalidade/equipes/placar, **Registro · Resumo · Análise**, retorno para Partidas e acesso secundário a elenco/ajuda/exportação. Não repetir dois menus completos ou placares.
- Futebol: escolher Por posse/Detalhado dentro de Registro quando M5 estiver pronta. Nesta etapa não mostrar um botão que promete um modo ainda inexistente.
- Vôlei: preservar modos funcionais e seleção atual; agrupar a escolha sem misturar com navegação global.

## Comportamento obrigatório

Preservar partida ativa, rascunho de cadastro e seleção ao navegar quando possível; ao abandonar edição não salva, oferecer salvar/descartar/cancelar. Navegar não encerra partida nem pausa relógio automaticamente. Retomada usa ID correto. Estados ativos precisam de texto/semântica, não só cor. Treino e ajuda devem informar a modalidade suportada; não apresentar treino de código de vôlei como treino de futebol.

## Aceite e verificação

Acesso a partidas/equipes por uma ação global; partida recente abre diretamente; nenhum recurso funcional fica sem caminho. Testar teclado, foco, mobile, 1366×768 e 1024×768, retorno de cadastro e retomada de ambas as modalidades. Atualizar testes de navegação afetados e rodar typecheck; não reescrever regras de scout.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M1_MENUS_E_NAVEGACAO.md.
Execute somente M1, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
