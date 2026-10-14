# Validação da revisão visual · 07/10/2026

## Verificações finais

- Build de produção (`npm run build`): aprovado. O empacotador mantém o aviso de bundle acima de 500 kB.
- ESLint nos componentes, telas e módulos alterados nesta revisão: aprovado.
- Testes específicos: 33 aprovados; os detalhes de cobertura estão abaixo.
- Playwright contra o build de produção: **5 cenários aprovados** na execução final, após o ajuste do painel do atleta para acompanhar a rolagem da página.
- Capturas finais inspecionadas e incluídas no [guia visual](../GUIA_VISUAL.md).

## Cobertura específica

- `e2e/court-workbench.spec.ts`: navegação, seis zonas espelhadas, hover, seleção do atleta, preservação do rascunho, registro, teclado sem gravação duplicada, retorno de foco do diálogo, finalizações de futebol/futsal, histórico, ajustes e recuperação de falha no IndexedDB.
- Viewports: 1366 × 768, 1024 × 844, 768 × 844 e 390 × 844. Verifica ausência de rolagem horizontal e proporções 3:2 no futebol e 2:1 no futsal.
- 9 arquivos de testes unitários/dos componentes: **33 testes aprovados**, incluindo captura espacial, superfícies, scout gestual, análise espacial e classificação das 12 regiões visíveis do vôlei.
- O teste de zonas verifica a relação entre coordenadas, metade da quadra e posição da equipe. A correção da classificação não modifica coordenadas persistidas.

O teste de navegador usa `e2e/fixtures/court-workbench.json`, uma partida demonstrativa versionada, e cria partidas novas de futebol/futsal em contextos isolados.

## Limites da suíte geral

Uma execução geral durante o desenvolvimento encontrou 565 testes aprovados e 21 falhas. Esse número é um diagnóstico intermediário, não o resultado final da revisão. As falhas de seletores do scout gestual, seleção da linha SVG e a classificação espacial tocadas nesta revisão foram corrigidas e seus testes específicos passaram.

Outros testes ainda precisam de manutenção ou investigação própria:

- `App.test.tsx`: expectativas da antiga página inicial, anterior à seleção por modalidade.
- `AppFlow.test.tsx`: expectativas de histórico/escalações sempre visíveis, foco inicial no código e disclosures que foram substituídos por destinos explícitos; também há cenários de placar/sets e códigos a revisar. O novo E2E cobre os fluxos principais da interface atual, mas não substitui toda essa suíte.
- `SequenceAnalyticsPanel.test.tsx`: expectativa do título antigo “Caminhos do rally”.
- `layer-boundaries.test.ts`: importação de infraestrutura no teste existente `ObservedSequenceAnalysis.test.ts`.
- `ObservedSequence.test.ts`: acesso a `essential_destination` quando `scout_trainer` está ausente em um evento legado de futebol.
- `large-match.test.ts`: ultrapassou o limiar de 10 segundos sob carga. Houve também timeouts de workers e de testes durante execuções simultâneas. As verificações específicas foram repetidas com um worker.

A suíte geral não foi declarada verde. As alterações que já existiam no projeto foram preservadas; falhas em módulos fora desta revisão não foram corrigidas incidentalmente.

## Reprodução

```sh
npm run build
npx playwright test e2e/court-workbench.spec.ts
npx vitest run \
  src/ui/components/VolleyballCourtZones.test.tsx \
  src/domain/analytics/sequence/SpatialContext.test.ts \
  src/domain/analytics/sequence/RallySequenceBuilder.test.ts \
  src/ui/screens/scout/GestureCourtInput.test.tsx \
  src/ui/screens/scout/SpatialCourtInputV2.test.tsx \
  src/ui/screens/scout/SpatialCourtSurface.test.tsx \
  src/ui/screens/scout/gesture/GestureScout.test.tsx \
  src/ui/screens/summary/SpatialAnalyticsPanel.test.tsx \
  src/ui/screens/scout/VolleyballVisualScout.test.tsx \
  --maxWorkers=1
```

Nesta máquina, dois servidores de desenvolvimento compartilhavam o otimizador do Vite; algumas tentativas exibiram a raiz vazia antes de carregar a aplicação. A verificação de navegador bem-sucedida foi executada contra o build de produção servido por `vite preview`, com um worker. O teste normal usa a configuração Playwright do projeto; deixe sua porta 4175 livre antes de executá-lo.
