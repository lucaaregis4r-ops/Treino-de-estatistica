# Prompts de execução para GPT-5.6 Luna

Use **um prompt por rodada**. Não juntar etapas.

---

## Prompt M0

Você está implementando somente M0 do pacote Scout Trainer 0.45.

Leia primeiro:
- ` AGENTS.md`
- `package.json`
- `CHANGELOG.md`
- `docs/scout-trainer-interface-0.4/ENTREGA.md`
- `docs/scout-trainer-interface-0.4/VALIDACAO.md`
- `docs/scout-trainer-0.45/LEIA_PRIMEIRO.md`
- `docs/scout-trainer-0.45/PLANO_MESTRE_0_45.md`
- `docs/scout-trainer-0.45/etapas/M0.md`

Regras:
1. Não implemente Markov, valor espacial, IA ou novos esportes.
2. Reproduza antes de corrigir.
3. Corrija somente dívidas que bloqueiam um baseline confiável para analytics.
4. Não atualize dependências.
5. Não formate o projeto inteiro.
6. Preserve IndexedDB e dados antigos.
7. Inclua os testes espaciais já existentes no baseline quando forem direcionados e baratos.
8. Ao terminar, atualize `STATUS_0_45.md`.
9. Pare após M0.

Entregue no final: arquivos alterados, testes executados, resultados, falhas restantes e por que não bloqueiam M1.

---

## Prompt M1

Execute somente M1 — modelo canônico de sequência + contexto espacial.

Leia:
- ` AGENTS.md`
- `docs/scout-trainer-0.45/STATUS_0_45.md`
- `docs/scout-trainer-0.45/etapas/M1.md`
- `docs/scout-trainer-0.45/CONTRATO_ANALYTICS.md`
- `docs/scout-trainer-0.45/MARKOV_ESPACIAL.md`
- `src/domain/scout/events/ScoutEvent.ts`
- `src/domain/rally/context/TacticalRallyProjection.ts`
- `src/domain/rally/context/RallyContextResolver.ts`
- `src/application/analytics/MatchAnalyticsService.ts`
- arquivos reais do sistema de zonas/coordenadas usados pelo spatial analytics atual, somente os necessários

Implemente uma projeção pura de sequência por rally. Não persista cópia dos dados. Não altere o schema do banco. Não crie UI. Não implemente Markov ainda.

O stateId deve continuar pequeno. Preserve `origin/target x,y` como contexto e derive região por função/perfil versionado. Não crie estados com coordenadas. Não invente `(0,0)` quando faltar dado.

Prefira novos arquivos em `src/domain/analytics/sequence/`.

Crie testes pequenos com rallies completos, incompletos, fora de ordem, com/sem coordenadas e coordenadas em bordas de região. Rode testes dirigidos e typecheck. Atualize STATUS e pare.

---

## Prompt M2

Execute somente M2 — motor Markov + valor espacial.

Leia:
- STATUS
- M2
- CONTRATO_ANALYTICS
- MARKOV_ESPACIAL
- implementação de `src/domain/analytics/sequence/`
- implementação espacial/zone system atual necessária
- `src/application/analytics/WinProbabilityService.ts` apenas para respeitar a fronteira existente

Implemente funções/classes puras para:
1. matriz e probabilidade de terminal;
2. delta de valor de transições;
3. padrões 2/3 estados;
4. valor condicionado por região;
5. valor por célula x,y para mapa;
6. origem/destino/trajetória quando aplicável.

Regras inegociáveis:
- equipe analisada explícita;
- `x,y` é contexto, não stateId;
- recepção: analisar principalmente destino;
- saque: analisar principalmente destino;
- ataque: origem, destino e trajetória;
- toda comparação espacial retorna baseline, n e delta;
- declarar unidade `event` ou `rally`;
- coordenada ausente é indisponível;
- n<5 não entra em ranking;
- não chamar associação de causalidade;
- não fazer UI, IA, rede ou persistência.

Se implementar shrinkage, use método explícito/testável e preserve probabilidade empírica. Não introduza dependência científica pesada.

Fixtures obrigatórias:
- Markov manual verificável;
- espacial com baseline 10/20=0,50 e região 6/8=0,75, delta +0,25;
- trajetórias com mesma origem e destinos diferentes;
- bordas e ausência de coordenada.

Testes + typecheck. Atualize STATUS e pare.

---

## Prompt M3

Execute somente M3 — painel Sequências + Valor espacial.

Leia:
- STATUS
- M3
- serviços analíticos de M2
- `SummaryScreen.tsx`
- `MatchAnalyticsPanel.tsx`
- `SpatialAnalyticsPanel.tsx`
- componente real de quadra e sistema de coordenadas
- componentes reais de filtros/análises salvas

Adicione análise Sequências + Valor espacial reutilizando sistemas existentes. Não crie persistência paralela. Não modifique o cálculo para atender layout.

Sequências: amostra, melhores/piores transições, padrões antes de ponto/erro e tabela.

Valor espacial: ação, origem/destino/trajetória, quadra colorida por probabilidade ou delta vs baseline, n por região, melhores/piores áreas e trajetórias de ataque.

Regras UX:
- sempre mostrar métrica/baseline;
- sem dado != 0%;
- n pequeno deve aparecer;
- não fazer 1/1 parecer evidência forte;
- reutilizar a quadra atual;
- não implementar Sankey.

Teste valores renderizados contra fixture controlada, clique/tooltip de região, falta de coordenadas e viewport responsiva. Atualize STATUS e pare.

---

## Prompt M4

Execute somente M4 — perguntas táticas determinísticas.

Leia STATUS, M4, CONTRATO_ANALYTICS, MARKOV_ESPACIAL e serviço de Sequências.

Implemente `TacticalQuestionService` que responde as treze perguntas definidas no plano por DTO estruturado. Inclua perguntas de recepção por área, saque por área, origem/destino do ataque e trajetórias.

Nenhuma internet e nenhuma prosa de LLM.

Cada resposta precisa de números, amostra/unidade, filtros, finding IDs, baseline quando aplicável e ressalvas. Se faltar x,y ou amostra, retornar indisponibilidade explícita.

Teste com fixtures. Não crie Gemini. Atualize STATUS e pare.

---

## Prompt M5

Execute somente M5 — BYOK Gemini.

Leia STATUS, M5, `TacticalQuestionService` e padrões de ports/infrastructure existentes.

Crie porta de provider de IA e adaptador Gemini separado. A IA interpreta apenas DTOs agregados calculados localmente.

Regras inegociáveis:
- nenhuma chave no repositório;
- chave em memória por padrão;
- nunca logar chave;
- não persistir chave no IndexedDB;
- não enviar eventos crus;
- não enviar lista bruta de coordenadas x,y;
- não enviar nomes de atletas por padrão;
- achados espaciais entram agregados com região/célula, n, baseline e delta;
- validar resposta estruturada;
- falha da IA não pode afetar analytics ou partida;
- app funciona integralmente sem chave.

Use mock/fake provider nos testes; não faça teste unitário depender da API real. Atualize STATUS e pare.

---

## Prompt M6

Execute somente M6 — relatório/exportação e contratos futuros.

Leia STATUS, M6, report model, JSON exporter, PDF renderer e sistema de análise salva.

Inclua resultados de Sequências + Valor espacial de forma opt-in e auditável. Exportar filtros, n/unidade, baseline, versão do método, coordinate/zone system, resolução e parâmetro de suavização se usado. Preserve importação/backup antigo. Não persista matriz/grade no evento canônico.

Se criar `SequenceAnalyticsProfile`/`SpatialAnalyticsProfile`, implemente apenas voleibol. Para futebol/futsal/basquete, somente ADR/documentação. Para dashboard de carga, apenas contrato conceitual de integração; não migre banco.

Atualize STATUS e pare.

---

## Prompt M7

Execute somente M7 — hardening/release.

Não adicione features.

Execute a matriz de validação da 0.45, incluindo os cenários espaciais: bordas, coordenada ausente, baseline/delta, trajetória, amostra pequena, recálculo após undo/correção, exportação e payload IA agregado.

Conserte regressões introduzidas pela 0.45, atualize README/CHANGELOG/documentação e só então altere a versão.

Não “limpe” dívidas antigas não relacionadas apenas para deixar números bonitos. Discrimine o que é novo, antigo, aprovado e não verificado.

Ao final, produza um resumo de release e pare.
