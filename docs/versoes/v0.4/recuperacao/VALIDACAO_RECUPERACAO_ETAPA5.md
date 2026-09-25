> **Versão/escopo:** Base 0.4.0; recuperação funcional de 19–20/09/2026.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

# Validação operacional — recuperação etapa 5

Executada em 20/09/2026 no checkout local, com Chrome do sistema via Playwright e IndexedDB real do navegador. Esta rodada automatizada e controlada não substitui acompanhar dez minutos de uma partida real com operador.

| Cenário | Resultado e evidência |
|---|---|
| Futebol sem elenco | Aprovado pelos fluxos das etapas 3/4: evento coletivo sem atleta fabricado. |
| Futebol com elenco | Aprovado em `recovery-stage5.spec.ts`: camisa selecionável e equipe correta. |
| 20 eventos variados | Aprovado em `football-recording-cycle.test.ts`: 20 IDs e índices únicos, sem atleta fabricado. |
| Cancelamento, correção e desfazer | Aprovado nos testes de integração e em `recovery-stage3.spec.ts`. |
| Resize e inversão | Aprovado em `recovery-stage2.spec.ts` e `recovery-stage5.spec.ts`; campo permanece visível e proporcional. |
| Reabertura | Aprovado para futebol nas etapas 3/4 e para vôlei na etapa 5. |
| Falha de persistência | Aprovado: erro visível, nenhum item no histórico e rascunho/local preservados. |
| Vôlei existente | Aprovado: registro, placar, quadras e reabertura. |
| Janelas-alvo | Aprovado em 1280×720, 1366×768, 1920×1080 e 390×844. |

## Problemas encontrados e corrigidos

- O campo de futebol era desmontado quando nenhuma ação espacial estava ativa. Agora permanece visível e fica apenas inerte, com instrução para escolher uma ação.
- O campo ficava cortado verticalmente em 1280×720. O limite responsivo passou a considerar os controles acrescentados.
- O cadastro de vôlei havia perdido a escalação inicial 1–12. Os padrões foram restaurados apenas para vôlei; futebol continua sem atletas fictícios.
- Uma fixture de análise declarava trajetórias sem destino. A fixture passou a fornecer os destinos observados, mantendo o seletor estrito.

Capturas: `output/recovery-stage5/field-persistent-mobile-390x844.png`, `output/recovery-stage5/persistence-failure-draft-preserved-1366x768.png` e `output/recovery-stage5/volleyball-regression-1366x768.png`.

## Limites reais

- Não houve acompanhamento de dez minutos de jogo real nem avaliação ergonômica por operador; esse ensaio humano permanece pendente.
- `AppFlow.test.tsx` e partes de `critical-flow.spec.ts` ainda codificam navegação/textos anteriores e não são usados como evidência desta etapa.
- O build conserva o aviso conhecido de chunk JavaScript acima de 500 kB.
