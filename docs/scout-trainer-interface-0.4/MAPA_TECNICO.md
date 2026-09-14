# Mapa técnico e limites de implementação

## Estrutura remota observada

React + TypeScript + Vite, Recharts, Vitest, Testing Library e Playwright. CSS próprio, persistência local e empacotamento Electron constam da estrutura. Não há motivo demonstrado para instalar outra stack para este redesenho. O navegador das capturas usa `localhost:5173`.

| Responsabilidade | Caminhos verificados no remoto | Como usar na execução |
|---|---|---|
| Navegação e estado superior | `src/ui/app/App.tsx` | Extrair chrome de UI preservando handlers, instâncias de serviços e estado |
| Estilos gerais | `src/ui/app/app.css` | Migrar seletivamente; cerca de 69 KB no remoto consultado; nunca anexar uma nova camada de overrides ao fim a cada etapa |
| Início / histórico | `src/ui/screens/home/HomeScreen.tsx`; `src/ui/screens/matches/MatchesScreen.tsx` | Manter contratos de abertura, importação e `busy` |
| Registro | `src/ui/screens/scout/ScoutScreen.tsx` | Orquestração existente; evitar reescrever o componente inteiro |
| Contexto / modos | `ScoreHeader.tsx`; `MatchContextBar.tsx`; `ScoutModeSelector.tsx`, no mesmo diretório scout | Consolidar cabeçalho e mapear modo Gestual no checkout local |
| Captura visual / espacial | `VolleyballVisualScout.tsx` e `.css`; `VisualScoutForm.tsx`; `SpatialCourtInputV2.tsx` e `.css` | Mudar composição e apresentação sem perder handlers e metadados |
| Geometria auxiliar | `courtGeometry.ts`; `TacticalCourt.tsx`; `MiniCourt.tsx`, no diretório scout | Identificar qual componente é efetivamente usado em cada modo |
| Escalações / histórico | `CourtLineup.tsx`; `NextSetLineupEditor.tsx`; `EventTimeline.tsx` | Reutilizar trocas, evolução do set, desfazer/refazer e correções |
| Resumo / análises | `src/ui/screens/summary/SummaryScreen.tsx`; `MatchAnalyticsPanel.tsx`; `SpatialAnalyticsPanel.tsx` e `.css` | Reorganizar superfícies e preservar recortes e exportação |
| Heatmap | `src/ui/screens/summary/HeatmapLayer.tsx`; `heatmap.ts` | Contrato de projeção/algoritmo protegido |
| Gráficos | `src/ui/screens/summary/charts/` | Reutilizar Recharts e gráficos locais; uniformizar apresentação |
| Telas restantes | `match-setup/NewMatchScreen.tsx`; `registrations/RegistrationsScreen.tsx`; `training/TrainingScreen.tsx`; `manual/ManualScreen.tsx`; `profile-editor/ProfileEditorScreen.tsx`; `free-log/FreeLogScreen.tsx`, sob `src/ui/screens/` | Migrar com leitura local do fluxo |
| Metadados de partida | `src/domain/match/entities/MatchMetadata.ts` | O remoto tem `createdAt`, nome, perfil e status; não tem placar nem `updatedAt` nesse contrato |
| Testes existentes | `src/ui/app/AppFlow.test.tsx`; testes próximos das telas; `e2e/critical-flow.spec.ts` | Selecionar por risco; adaptar expectativas comportamentais legítimas |

Há também um arquivo vazio `src/ui/scout/MiniCourt.tsx` no remoto. Não confundi-lo com `src/ui/screens/scout/MiniCourt.tsx`. A raiz remota contém um arquivo chamado ` AGENTS.md`, com espaço inicial. Ler também esse arquivo, se existir localmente, sem renomeá-lo nesta tarefa. Suas instruções incluem leitura prévia, mudanças precisas, verificação funcional e lint/typecheck.

## Arquitetura de UI proposta

Antes de criar, buscar componente equivalente. Diretórios abaixo são candidatos, sujeitos ao mapa U0:

| Local proposto | Conteúdo limitado |
|---|---|
| `src/ui/styles/tokens.css` | Variáveis de tema e geometria; aliases transitórios |
| `src/ui/components/ui/` | Button, Field, ChoiceGroup, StatusMessage e EmptyState quando houver reutilização real |
| `src/ui/components/layout/` | AppHeader, PageHeader e MatchHeader se ainda não houver equivalentes |
| Estilo de cada tela | Regras com prefixo da tela; sem selecionar globalmente todos os `section`, `button` ou `svg` |
| `src/ui/screens/scout/` | Componentes de apresentação extraídos da captura somente quando simplificam a edição |

Responsabilidade: estado da partida → seletores existentes → propriedades dos componentes → eventos de UI → handlers existentes → serviço existente. Componentes visuais não gravam diretamente em IndexedDB e não calculam pontuação/rotação. Não espelhar o workspace num segundo estado React.

CSS: manter o reset global numa única origem. Carregar tokens uma vez e migrar os seletores da tela em execução. Remover a regra antiga correspondente quando substituir; buscar duplicações antes de finalizar. Evitar `!important`, atributos inline usados como tema e novos hex soltos. Cores científicas do heatmap, dados de séries e assets podem precisar de tratamento próprio documentado.

## Contratos protegidos

Preservar schemas e IDs de partidas, atletas, equipes, eventos, avaliações e análises. Não alterar reducers, cálculo de rally/placar/rotação, regras de substituição, parsers, fórmulas analíticas e semântica dos símbolos. Preservar eventos sem atleta e cobertura parcial. Não converter atleta ausente em jogador fictício, camisa zero ou primeiro nome da lista.

Preservar coordenadas normalizadas: em cada modo, medir o retângulo correto com `getBoundingClientRect`; overlay e área clicável devem se referir ao mesmo retângulo. Uma quadra mais bonita que muda o destino de um clique é regressão. Não alterar x/y existentes por troca visual das equipes. Pontos fora da superfície continuam seguindo o contrato local; não introduzir clamp diferente ou área extra nesta tarefa.

Preservar filtros, salvamento e seleção para relatório onde já existem. O `onConfirm` de um componente pode completar apenas a geometria, enquanto `onRegister` grava a ação; mapear esse encadeamento na U0. Uma intenção de registrar deve produzir exatamente um evento confirmado.

Na captura remota, `SpatialCourtInputV2` chama `onConfirm` após o segundo clique. Isso não prova que a ação inteira foi persistida. Não apagar o botão final antes de conferir o consumidor local. O modo Gestual das capturas não está no seletor remoto de três modos; localizar sua implementação local em vez de recriá-la.

Não mexer em dependências, lockfile, empacotamento, service worker e publicação sem necessidade demonstrada. Manter funcionamento offline sem fontes/CDNs novas. Não executar `npm audit fix`, `npm update`, formatação do repositório inteiro, limpeza de storage, reset destrutivo ou instalação de navegador a cada etapa.

## Protocolo de execução para o Luna

Uma etapa por vez. Ler `ESTADO.md`, a etapa pedida e o contrato de design correspondente ao seu escopo. Consultar este mapa na primeira execução e novamente somente quando precisar de um caminho ou limite técnico. Reusar o inventário U0; pesquisar novamente somente se um caminho mudou ou uma dúvida impedir a implementação. Não ler todos os documentos históricos do projeto a cada solicitação. Não usar subagentes neste plano.

Antes de editar: `git status --short`, ler instruções aplicáveis e os arquivos do escopo. Não sobrescrever alterações do usuário. Usar branch de interface quando a situação de trabalho permitir, sem trocar ou limpar uma árvore que tenha trabalho em andamento. Registrar branch/commit local em U0; nenhum push/merge/deploy faz parte da execução.

Comandos confirmados no `package.json` remoto: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`. Validar scripts locais antes do uso. Lint e typecheck após mudanças de código, conforme instruções do projeto; testes dirigidos quando afetarem comportamento. Não rodar a suíte completa após cada troca de cor. U7 roda as portas finais uma vez e repete somente falhas corrigidas.

Se dependências faltarem, usar o lockfile e gerenciador existentes. Uma tentativa de instalação com timeout explícito de 5 minutos, resumindo a saída, sem loops automáticos. Se falhar por rede/ambiente, registrar o erro e continuar somente verificações possíveis. Não marcar como validado aquilo que não rodou. Não usar dados reais como fixture de teste nem apagar a base local.

Toda etapa termina com: mudança concreta, arquivos alterados, verificações executadas/resultados, pendências reais, próxima etapa. Atualizar `ESTADO.md` e registrar captura antes/depois das telas alteradas quando o ambiente permitir. Não expandir o trabalho para corrigir bugs antigos sem relação; classificá-los em separados do que a etapa introduziu.
